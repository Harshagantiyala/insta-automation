/**
 * DEV-ONLY ROUTES — completely disabled in production.
 *
 * These endpoints allow local testing of the full DM pipeline
 * (webhook → BullMQ queue → dm-worker → metaApiService) without
 * needing a real Meta webhook delivery or ngrok.
 *
 * Mount: /api/dev  (only in NODE_ENV=development, see routes/index.js)
 */
const express = require('express');
const router = express.Router();

const config = require('../config/env');
const authMiddleware = require('../middleware/authMiddleware');
const { tenantMiddleware, scopedFilter } = require('../middleware/tenantMiddleware');
const { processEntry } = require('../controllers/webhookController');
const InstagramAccount = require('../models/InstagramAccount');
const MessageLog = require('../models/MessageLog');

// Hard production guard — returns 404 so the route doesn't even reveal itself
router.use((req, res, next) => {
  if (config.env !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

// All dev routes require a logged-in tenant
router.use(authMiddleware, tenantMiddleware);

/**
 * POST /api/dev/simulate-dm
 *
 * Simulates an inbound Instagram DM through the FULL pipeline:
 *   fake webhook entry → processEntry → enqueueDirectMessage → dm-worker → metaApiService
 *
 * Body (all optional):
 *   accountId  {number}  — ID of the InstagramAccount to target. Defaults to the first active account.
 *   senderId   {string}  — Fake sender IG ID. Defaults to "test_sender_001".
 *   text       {string}  — Message body. Defaults to "Hello! This is a test DM.".
 */
router.post('/simulate-dm', async (req, res, next) => {
  try {
    const {
      accountId,
      senderId = 'test_sender_001',
      text = 'Hello! This is a test DM.',
    } = req.body || {};

    // Resolve which account to target (scoped to the logged-in tenant)
    const whereClause = scopedFilter(req, accountId ? { id: Number(accountId), isActive: true } : { isActive: true });
    const account = await InstagramAccount.findOne({ where: whereClause });

    if (!account) {
      return res.status(404).json({
        error: 'No active Instagram account found for your tenant.',
        hint: 'Go to "Instagram Accounts" in the dashboard and connect an account first.',
      });
    }

    // Build a fake Meta webhook entry that mimics a real `messaging` event.
    // entry.id must match account.igUserId so processEntry finds the account.
    const fakeTimestamp = Date.now();
    const fakeEntry = {
      id: account.igUserId,   // ← this is the key: must equal what Meta sends
      time: fakeTimestamp,
      changes: [],
      messaging: [
        {
          sender: { id: senderId },
          recipient: { id: account.igUserId },
          timestamp: fakeTimestamp,
          message: {
            mid: 'sim_mid_' + Math.random().toString(36).substr(2, 9),
            text,
          },
        },
      ],
    };

    // Run the real webhook processing path
    await processEntry(fakeEntry);

    // Return a helpful summary
    const recentLog = await MessageLog.findOne({
      where: { instagramAccountId: account.id, recipientIgId: senderId },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      simulated: {
        account: `@${account.igUsername}`,
        igUserId: account.igUserId,
        fakeSenderId: senderId,
        messageText: text,
      },
      messageLog: recentLog
        ? { id: recentLog.id, status: recentLog.status, content: recentLog.content }
        : null,
      note: recentLog?.status === 'queued'
        ? 'Job queued ✅ — check the DM Worker terminal for processing logs.'
        : recentLog?.status === 'sent'
        ? 'DM sent ✅ — mock send logged to console (real send needs OAuth account).'
        : 'No matching flow found. Create a flow with trigger type "dm_inbound" and make sure it is Active.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dev/simulate-comment-dm
 *
 * Simulates a comment on a post that triggers a Comment-to-DM flow.
 *
 * Body (all optional):
 *   accountId   {number}  — InstagramAccount ID. Defaults to first active.
 *   commenterId {string}  — Fake commenter ID. Defaults to "test_commenter_001".
 *   keyword     {string}  — Comment text. Defaults to "INFO".
 *   mediaId     {string}  — Fake media/post ID. Defaults to null (matches any media).
 */
router.post('/simulate-comment-dm', async (req, res, next) => {
  try {
    const {
      accountId,
      commenterId = 'test_commenter_001',
      keyword = 'INFO',
      mediaId = null,
    } = req.body || {};

    const whereClause = scopedFilter(req, accountId ? { id: Number(accountId), isActive: true } : { isActive: true });
    const account = await InstagramAccount.findOne({ where: whereClause });

    if (!account) {
      return res.status(404).json({
        error: 'No active Instagram account found.',
        hint: 'Connect an account first via the Instagram Accounts page.',
      });
    }

    const fakeCommentId = 'sim_comment_' + Math.random().toString(36).substr(2, 9);

    const fakeEntry = {
      id: account.igUserId,
      time: Date.now(),
      messaging: [],
      changes: [
        {
          field: 'comments',
          value: {
            id: fakeCommentId,
            text: keyword,
            from: { id: commenterId, username: 'test_user' },
            media: mediaId ? { id: mediaId } : undefined,
          },
        },
      ],
    };

    await processEntry(fakeEntry);

    const recentLog = await MessageLog.findOne({
      where: { instagramAccountId: account.id, recipientIgId: commenterId },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      simulated: {
        account: `@${account.igUsername}`,
        fakeCommenterId: commenterId,
        commentText: keyword,
        fakeCommentId,
      },
      messageLog: recentLog
        ? { id: recentLog.id, status: recentLog.status, content: recentLog.content }
        : null,
      note: recentLog
        ? 'Comment-to-DM flow triggered ✅'
        : 'No matching comment_keyword flow. Create one with a matching keyword and make sure it is Active.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dev/simulate-story-mention
 */
router.post('/simulate-story-mention', async (req, res, next) => {
  try {
    const { accountId, senderId = 'test_sender_001' } = req.body || {};
    const whereClause = scopedFilter(req, accountId ? { id: Number(accountId), isActive: true } : { isActive: true });
    const account = await InstagramAccount.findOne({ where: whereClause });

    if (!account) return res.status(404).json({ error: 'No active Instagram account found.' });

    const fakeEntry = {
      id: account.igUserId,
      time: Date.now(),
      messaging: [],
      changes: [
        {
          field: 'mentions',
          value: {
            from: { id: senderId, username: 'test_user' },
            media: { id: 'sim_media_' + Math.random().toString(36).substr(2, 9) }
          },
        },
      ],
    };

    await processEntry(fakeEntry);

    const recentLog = await MessageLog.findOne({
      where: { instagramAccountId: account.id, recipientIgId: senderId, triggerType: 'story_mention' },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      simulated: { trigger: 'story_mention', account: `@${account.igUsername}`, fakeSenderId: senderId },
      messageLog: recentLog ? { id: recentLog.id, status: recentLog.status, content: recentLog.content } : null,
      note: recentLog ? 'Flow triggered ✅' : 'No matching story_mention flow found.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dev/simulate-story-reply
 */
router.post('/simulate-story-reply', async (req, res, next) => {
  try {
    const { accountId, senderId = 'test_sender_001', text = 'cool story!' } = req.body || {};
    const whereClause = scopedFilter(req, accountId ? { id: Number(accountId), isActive: true } : { isActive: true });
    const account = await InstagramAccount.findOne({ where: whereClause });

    if (!account) return res.status(404).json({ error: 'No active Instagram account found.' });

    const fakeEntry = {
      id: account.igUserId,
      time: Date.now(),
      changes: [],
      messaging: [
        {
          sender: { id: senderId },
          recipient: { id: account.igUserId },
          timestamp: Date.now(),
          message: {
            mid: 'sim_mid_' + Math.random().toString(36).substr(2, 9),
            text,
            reply_to: { story: { url: 'https://mock.instagram.com/story', id: '123' } }
          },
        },
      ],
    };

    await processEntry(fakeEntry);

    const recentLog = await MessageLog.findOne({
      where: { instagramAccountId: account.id, recipientIgId: senderId, triggerType: 'story_reply' },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      simulated: { trigger: 'story_reply', account: `@${account.igUsername}`, fakeSenderId: senderId, text },
      messageLog: recentLog ? { id: recentLog.id, status: recentLog.status, content: recentLog.content } : null,
      note: recentLog ? 'Flow triggered ✅' : 'No matching story_reply flow found.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dev/status
 * Quick health-check for the dev tooling — lists connected accounts + active flows.
 */
router.get('/status', async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const Flow = require('../models/Flow');

    const accounts = await InstagramAccount.findAll({
      where: scopedFilter(req),
      attributes: ['id', 'igUserId', 'igUsername', 'isActive', 'webhookSubscribed', 'tokenType'],
    });

    const flows = await Flow.findAll({
      where: scopedFilter(req, { isActive: true }),
      attributes: ['id', 'name', 'trigger', 'isActive'],
    });

    res.json({
      environment: config.env,
      connectedAccounts: accounts,
      activeFlows: flows,
      tip: flows.length === 0
        ? 'No active flows — create a flow with trigger "dm_inbound" to test simulate-dm.'
        : `${flows.length} active flow(s) ready.`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
