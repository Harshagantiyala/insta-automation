const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');

const connection = createRedisConnection('dm-queue');

/**
 * Every "send this DM" job lands here. We deliberately do NOT use BullMQ's
 * built-in `limiter` option globally, because the 200/hr cap is PER
 * INSTAGRAM ACCOUNT, not per queue. Instead, the worker checks
 * rateLimiterService before sending and re-delays the job if the account's
 * window is exhausted (see dmWorker.js + customBackoff.js).
 */
const dmQueue = new Queue('dm-send', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'custom' }, // resolved by customBackoff.js, registered on the Worker
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 5000 },
  },
});

/**
 * Enqueues a DM send. `igAccountId` is the Mongo _id of the InstagramAccount
 * doc — used as the rate-limit partition key.
 */
async function enqueueDirectMessage({
  tenantId,
  igAccountId,
  recipientIgId,
  text,
  flowId = null,
  triggerType,
  sourceCommentId = null,
  sourceMediaId = null,
  messageLogId,
  delayMs = 0,
}) {
  return dmQueue.add(
    'send-dm',
    {
      tenantId,
      igAccountId,
      recipientIgId,
      text,
      flowId,
      triggerType,
      sourceCommentId,
      sourceMediaId,
      messageLogId,
    },
    {
      jobId: messageLogId ? `dm-${messageLogId}` : undefined, // idempotency: one job per MessageLog row
      delay: delayMs,
    }
  );
}

module.exports = { dmQueue, enqueueDirectMessage };
