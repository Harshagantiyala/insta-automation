// Run this as a SEPARATE process from the API server: `npm run worker`
// (or its own container/service in docker-compose / Railway).
require('dotenv').config();
const { Worker } = require('bullmq');

const config = require('../config/env');
const connectDB = require('../config/db');
const { sequelize } = require('../config/db');
const { createRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');

const rateLimiterService = require('../services/rateLimiterService');
const metaApiService = require('../services/metaApiService');
const encryptionService = require('../services/encryptionService');
const { buildCustomBackoffStrategy, RateLimitError } = require('./customBackoff');

const InstagramAccount = require('../models/InstagramAccount');
const MessageLog = require('../models/MessageLog');
const Flow = require('../models/Flow');

const connection = createRedisConnection('dm-worker');

async function processJob(job) {
  const {
    igAccountId,
    recipientIgId,
    text,
    flowId,
    messageLogId,
    sourceCommentId,
  } = job.data;

  // 1. Spam protection: same recipient within the duplicate window?
  const alreadyMessaged = await rateLimiterService.hasRecentMessage(igAccountId, recipientIgId);
  if (alreadyMessaged) {
    const log = await MessageLog.findByPk(messageLogId);
    if (log) {
      await log.update({
        status: 'skipped_duplicate',
        errorMessage: 'Recipient already messaged within the duplicate-prevention window',
      });
    }
    logger.info(`[dm-worker] skipped duplicate DM to ${recipientIgId} on account ${igAccountId}`);
    return { skipped: 'duplicate' };
  }

  // 2. Hard hourly cap check (atomic increment in Redis).
  const limitCheck = await rateLimiterService.checkAndIncrementHourlyLimit(igAccountId);
  if (!limitCheck.allowed) {
    logger.warn(
      `[dm-worker] hourly limit hit for account ${igAccountId}, resuming at ${limitCheck.resumeAt.toISOString()}`
    );
    // Throwing a RateLimitError triggers our custom backoff strategy, which
    // delays the retry until exactly when the Redis window resets.
    throw new RateLimitError(`Hourly DM limit reached for account ${igAccountId}`);
  }

  // 3. Load the account + decrypt its token.
  const account = await InstagramAccount.findByPk(igAccountId);
  if (!account || !account.isActive) {
    await rateLimiterService.decrementHourlyCounter(igAccountId); // give back the slot
    const log = await MessageLog.findByPk(messageLogId);
    if (log) {
      await log.update({
        status: 'failed',
        errorMessage: 'Instagram account not found or inactive',
      });
    }
    return { skipped: 'inactive_account' };
  }

  let accessToken;
  try {
    accessToken = encryptionService.decrypt(account.encryptedAccessToken);
  } catch (err) {
    await rateLimiterService.decrementHourlyCounter(igAccountId);
    throw new Error(`Failed to decrypt access token: ${err.message}`);
  }

  // 4. Actually send the DM via the Meta Graph API.
  //
  // NOTE: Meta requires comment-triggered first-contact DMs to go through
  // the `/private_replies` endpoint rather than the standard `/messages`
  // send API, since the recipient hasn't opened a messaging thread with the
  // business yet. We branch on `sourceCommentId` to pick the right call.
  try {
    if (sourceCommentId) {
      await metaApiService.sendPrivateReplyToComment({
        commentId: sourceCommentId,
        accessToken,
        text,
      });
    } else {
      await metaApiService.sendDirectMessage({
        pageId: account.facebookPageId,
        accessToken,
        recipientIgId,
        text,
      });
    }

    await rateLimiterService.markMessageSent(igAccountId, recipientIgId);
    
    const log = await MessageLog.findByPk(messageLogId);
    if (log) {
      await log.update({ status: 'sent', sentAt: new Date() });
    }

    if (flowId) {
      const flow = await Flow.findByPk(flowId);
      if (flow) {
        const stats = flow.stats || { triggeredCount: 0, lastTriggeredAt: null };
        stats.triggeredCount = (stats.triggeredCount || 0) + 1;
        stats.lastTriggeredAt = new Date();
        await flow.update({ stats });
      }
    }

    return { sent: true };
  } catch (err) {
    // Give back the rate-limit slot since the send actually failed, then let
    // BullMQ's `attempts` + default backoff retry the genuine API error.
    await rateLimiterService.decrementHourlyCounter(igAccountId);
    
    const log = await MessageLog.findByPk(messageLogId);
    if (log) {
      await log.update({
        status: 'failed',
        errorMessage: err.response?.data?.error?.message || err.message,
      });
    }
    throw err;
  }
}

async function start() {
  await connectDB();
  const worker = startDmWorker();

  process.on('SIGTERM', async () => {
    await worker.close();
    await sequelize.close();
    process.exit(0);
  });
}

function startDmWorker(customConnection) {
  const conn = customConnection || connection;
  const worker = new Worker('dm-send', processJob, {
    connection: conn,
    concurrency: 10,
    settings: {
      backoffStrategy: buildCustomBackoffStrategy(),
    },
  });

  worker.on('completed', (job, result) => {
    logger.info(`[dm-worker] job ${job.id} completed: ${JSON.stringify(result)}`);
  });

  worker.on('failed', (job, err) => {
    const details = err.response?.data ? JSON.stringify(err.response.data) : '';
    logger.error(`[dm-worker] job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}. Details: ${details}`);
  });

  logger.info('[dm-worker] worker started, listening for jobs on queue "dm-send"');
  return worker;
}

if (require.main === module) {
  start().catch((err) => {
    logger.error(`[dm-worker] fatal startup error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { startDmWorker, processJob };
