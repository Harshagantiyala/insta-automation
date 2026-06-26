// Run as its own process: `npm run worker:fallback`
require('dotenv').config();
const { Worker } = require('bullmq');

const connectDB = require('../config/db');
const { sequelize } = require('../config/db');
const { createRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');

const conversationStateService = require('../services/conversationStateService');
const Flow = require('../models/Flow');
const MessageLog = require('../models/MessageLog');
const { enqueueDirectMessage } = require('./dmQueue');

const connection = createRedisConnection('fallback-worker');

async function processFallbackCheck(job) {
  const { tenantId, igAccountId, recipientIgId, flowId, inboundAt } = job.data;

  const lastOutboundAt = await conversationStateService.getLastOutboundAt(igAccountId, recipientIgId);

  // Someone (human agent or another automation) already replied AFTER the
  // original inbound message — no fallback needed.
  if (lastOutboundAt && lastOutboundAt > inboundAt) {
    logger.info(`[fallback-worker] skipping fallback for ${recipientIgId} — already replied`);
    return { skipped: 'already_replied' };
  }

  const flow = await Flow.findByPk(flowId);
  if (!flow || !flow.isActive || !flow.fallback?.enabled) {
    return { skipped: 'flow_inactive_or_missing' };
  }

  const text = flow.fallback.messageTemplate || flow.action.messageTemplate;

  const messageLog = await MessageLog.create({
    tenantId,
    instagramAccountId: igAccountId,
    flowId,
    recipientIgId,
    triggerType: 'fallback',
    content: text,
    status: 'queued',
  });

  await enqueueDirectMessage({
    tenantId,
    igAccountId,
    recipientIgId,
    text,
    flowId,
    triggerType: 'fallback',
    messageLogId: messageLog.id,
  });

  logger.info(`[fallback-worker] queued fallback DM for ${recipientIgId} on account ${igAccountId}`);
  return { queued: true };
}

async function start() {
  await connectDB();
  const worker = startFallbackWorker();

  process.on('SIGTERM', async () => {
    await worker.close();
    await sequelize.close();
    process.exit(0);
  });
}

function startFallbackWorker(customConnection) {
  const conn = customConnection || connection;
  const worker = new Worker('auto-reply-fallback', processFallbackCheck, {
    connection: conn,
    concurrency: 20,
  });

  worker.on('completed', (job, result) => {
    logger.info(`[fallback-worker] job ${job.id} completed: ${JSON.stringify(result)}`);
  });
  worker.on('failed', (job, err) => {
    logger.error(`[fallback-worker] job ${job?.id} failed: ${err.message}`);
  });

  logger.info('[fallback-worker] worker started, listening on queue "auto-reply-fallback"');
  return worker;
}

if (require.main === module) {
  start().catch((err) => {
    logger.error(`[fallback-worker] fatal startup error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { startFallbackWorker, processFallbackCheck };
