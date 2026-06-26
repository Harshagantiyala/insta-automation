const config = require('../config/env');
const logger = require('../utils/logger');

const InstagramAccount = require('../models/InstagramAccount');
const Flow = require('../models/Flow');
const MessageLog = require('../models/MessageLog');

const { enqueueDirectMessage } = require('../queues/dmQueue');
const { scheduleFallbackCheck } = require('../queues/fallbackQueue');
const conversationStateService = require('../services/conversationStateService');
const metaApiService = require('../services/metaApiService');
const encryptionService = require('../services/encryptionService');

function fuzzyMatch(text, keyword) {
  const cleanText = (text || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const cleanKeyword = (keyword || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  return cleanKeyword.length > 0 && cleanText.includes(cleanKeyword);
}

// ---------------------------------------------------------------------
// GET /webhooks/instagram — Meta's one-time verification handshake
// ---------------------------------------------------------------------
function verifyWebhookHandshake(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.meta.webhookVerifyToken) {
    logger.info('[webhook] verification handshake succeeded');
    return res.status(200).send(challenge);
  }

  logger.warn('[webhook] verification handshake failed — token mismatch');
  return res.sendStatus(403);
}

// ---------------------------------------------------------------------
// POST /webhooks/instagram — actual event delivery
// ---------------------------------------------------------------------
async function handleWebhookEvent(req, res) {
  // Meta expects a 200 within a few seconds or it will retry (and eventually
  // disable the subscription). We ack immediately and process in the
  // background; the signature was already verified by middleware before we
  // got here.
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== 'instagram') {
    logger.warn(`[webhook] ignoring unexpected object type: ${body.object}`);
    return;
  }

  try {
    for (const entry of body.entry || []) {
      await processEntry(entry).catch((err) =>
        logger.error(`[webhook] error processing entry ${entry.id}: ${err.message}`)
      );
    }
  } catch (err) {
    logger.error(`[webhook] unhandled error: ${err.message}`);
  }
}

async function processEntry(entry) {
  // `entry.id` is the Instagram-scoped Business Account ID for IG webhooks.
  const account = await InstagramAccount.findOne({ where: { igUserId: entry.id, isActive: true } });
  if (!account) {
    logger.warn(`[webhook] no active InstagramAccount found for igUserId ${entry.id}`);
    return;
  }

  // `changes` carries comments + story mentions; `messaging` carries DMs +
  // story replies. Both can be present in the same entry.
  for (const change of entry.changes || []) {
    try {
      if (change.field === 'comments') {
        await handleCommentEvent(account, change.value);
      } else if (change.field === 'mentions') {
        await handleStoryMentionEvent(account, change.value);
      }
    } catch (err) {
      logger.error(`[webhook] error processing change event: ${err.message}`);
    }
  }

  for (const messagingEvent of entry.messaging || []) {
    try {
      await handleMessagingEvent(account, messagingEvent);
    } catch (err) {
      logger.error(`[webhook] error processing messaging event: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------
// Feature 1: Comment-to-DM
// ---------------------------------------------------------------------
async function handleCommentEvent(account, value) {
  const commentText = (value.text || '').toLowerCase();
  const commenterId = value.from?.id;
  if (!commenterId) return;

  const allFlows = await Flow.findAll({
    where: {
      tenantId: account.tenantId,
      instagramAccountId: account.id,
      isActive: true,
    },
  });

  const matchingFlows = allFlows.filter((flow) => flow.trigger?.type === 'comment_keyword');

  for (const flow of matchingFlows) {
    const mediaMatches = !flow.trigger.mediaId || flow.trigger.mediaId === value.media?.id;
    const keywords = flow.trigger.keywords || [];
    const keywordMatches = keywords.length === 0 || keywords.some((kw) => fuzzyMatch(commentText, kw));

    if (mediaMatches && keywordMatches) {
      const text = renderTemplate(flow.action?.messageTemplate, { username: value.from?.username });

      const messageLog = await MessageLog.create({
        tenantId: account.tenantId,
        instagramAccountId: account.id,
        flowId: flow.id,
        recipientIgId: commenterId,
        triggerType: 'comment_keyword',
        sourceCommentId: value.id,
        sourceMediaId: value.media?.id || null,
        content: text,
        status: 'queued',
      });

      await enqueueDirectMessage({
        tenantId: account.tenantId,
        igAccountId: account.id,
        recipientIgId: commenterId,
        text,
        flowId: flow.id,
        triggerType: 'comment_keyword',
        sourceCommentId: value.id,
        sourceMediaId: value.media?.id || null,
        messageLogId: messageLog.id,
        delayMs: Math.floor(Math.random() * 5000) + 3000, // 3-8s human delay
      });

      // If a public comment reply template is configured, send the reply publicly!
      const commentReplyTemplate = flow.action?.commentReplyTemplate;
      if (commentReplyTemplate) {
        const commentReplyText = renderTemplate(commentReplyTemplate, { username: value.from?.username });
        try {
          const accessToken = encryptionService.decrypt(account.encryptedAccessToken);
          metaApiService.sendPublicCommentReply({
            commentId: value.id,
            accessToken,
            text: commentReplyText
          }).catch(err => {
            logger.error(`[webhook] failed to send public comment reply for comment ${value.id}: ${err.message}`);
          });
        } catch (decryptErr) {
          logger.error(`[webhook] failed to decrypt access token for comment reply: ${decryptErr.message}`);
        }
      }

      logger.info(`[webhook] comment-to-DM triggered: flow "${flow.name}" for comment ${value.id}`);
      break; // only fire the first matching flow per comment
    }
  }
}

// ---------------------------------------------------------------------
// Feature 2 & 3: Auto-Reply (DM) + Story Reply
// ---------------------------------------------------------------------
async function handleMessagingEvent(account, messagingEvent) {
  const senderId = messagingEvent.sender?.id;
  const isEcho = messagingEvent.message?.is_echo === true;
  const timestamp = messagingEvent.timestamp || Date.now();

  // The page/IG account itself sent this message (human agent via the IG
  // app, or one of our own automated sends). Record it so any pending
  // fallback check knows the conversation has been handled.
  if (isEcho) {
    const recipientId = messagingEvent.recipient?.id;
    if (recipientId) await conversationStateService.markOutbound(account.id, recipientId, timestamp);
    return;
  }

  if (!senderId || !messagingEvent.message) return;

  // Story reply: a reply to one of the business's story posts shows up with
  // `message.reply_to.story` populated.
  const isStoryReply = Boolean(messagingEvent.message.reply_to?.story);
  const triggerType = isStoryReply ? 'story_reply' : 'dm_inbound';

  const allFlows = await Flow.findAll({
    where: {
      tenantId: account.tenantId,
      instagramAccountId: account.id,
      isActive: true,
    },
  });

  const messageText = (messagingEvent.message?.text || '').toLowerCase();

  let flow = null;
  for (const f of allFlows) {
    if (f.trigger?.type !== triggerType) continue;

    if (triggerType === 'dm_inbound') {
      const keywords = f.trigger?.keywords || [];
      const matches = keywords.length === 0 || keywords.some((kw) => fuzzyMatch(messageText, kw));
      if (matches) {
        flow = f;
        break;
      }
    } else {
      flow = f; // story_reply just takes the first matching flow
      break;
    }
  }

  if (!flow) return;

  const text = renderTemplate(flow.action?.messageTemplate, { username: undefined });

  const messageLog = await MessageLog.create({
    tenantId: account.tenantId,
    instagramAccountId: account.id,
    flowId: flow.id,
    recipientIgId: senderId,
    triggerType,
    content: text,
    status: 'queued',
  });

  await enqueueDirectMessage({
    tenantId: account.tenantId,
    igAccountId: account.id,
    recipientIgId: senderId,
    text,
    flowId: flow.id,
    triggerType,
    messageLogId: messageLog.id,
    delayMs: Math.floor(Math.random() * 5000) + 3000, // 3-8s human delay
  });

  // Auto-Reply fallback: if this flow has a fallback configured, schedule a
  // delayed check that fires the fallback message if nobody (human or
  // automation) replies within `waitMinutes`.
  if (triggerType === 'dm_inbound' && flow.fallback?.enabled) {
    await scheduleFallbackCheck(
      {
        tenantId: account.tenantId,
        igAccountId: account.id,
        recipientIgId: senderId,
        flowId: flow.id,
        inboundAt: timestamp,
      },
      flow.fallback.waitMinutes * 60 * 1000
    );
  }

  logger.info(`[webhook] ${triggerType} flow "${flow.name}" triggered for sender ${senderId}`);
}

async function handleStoryMentionEvent(account, value) {
  // `mentions` change fires when someone @mentions the business in their
  // own story. Reuse the same flow/queue plumbing as story_reply.
  const senderId = value.from?.id;
  if (!senderId) return;

  const allFlows = await Flow.findAll({
    where: {
      tenantId: account.tenantId,
      instagramAccountId: account.id,
      isActive: true,
    },
  });

  const flow = allFlows.find((flow) => flow.trigger?.type === 'story_mention');
  if (!flow) return;

  const text = renderTemplate(flow.action?.messageTemplate, { username: value.from?.username });

  const messageLog = await MessageLog.create({
    tenantId: account.tenantId,
    instagramAccountId: account.id,
    flowId: flow.id,
    recipientIgId: senderId,
    triggerType: 'story_mention',
    content: text,
    status: 'queued',
  });

  await enqueueDirectMessage({
    tenantId: account.tenantId,
    igAccountId: account.id,
    recipientIgId: senderId,
    text,
    flowId: flow.id,
    triggerType: 'story_mention',
    messageLogId: messageLog.id,
    delayMs: Math.floor(Math.random() * 5000) + 3000, // 3-8s human delay
  });
}

function renderTemplate(template, vars) {
  return (template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

module.exports = { verifyWebhookHandshake, handleWebhookEvent, processEntry };
