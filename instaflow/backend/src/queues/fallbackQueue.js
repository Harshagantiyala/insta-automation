const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');

const connection = createRedisConnection('fallback-queue');

const fallbackQueue = new Queue('auto-reply-fallback', {
  connection,
  defaultJobOptions: {
    attempts: 1, // a missed check just means the user waits a bit longer; no need to retry-storm
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 1000 },
  },
});

/**
 * Schedules a delayed check: "if nobody has replied to this person by the
 * time this job runs, send the fallback message."
 */
async function scheduleFallbackCheck({ tenantId, igAccountId, recipientIgId, flowId, inboundAt }, delayMs) {
  return fallbackQueue.add(
    'check-fallback',
    { tenantId, igAccountId, recipientIgId, flowId, inboundAt },
    {
      delay: delayMs,
      // Dedup key: only one pending fallback check per (account, recipient,
      // flow) at a time — if the user messages again before the timer
      // fires, we don't want to stack duplicate fallback sends.
      jobId: `fallback:${igAccountId}:${recipientIgId}:${flowId}`,
    }
  );
}

module.exports = { fallbackQueue, scheduleFallbackCheck };
