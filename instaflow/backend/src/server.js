const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');
const scheduleTokenRefreshJob = require('./jobs/tokenRefreshJob');
const { startDmWorker } = require('./queues/dmWorker');
const { startFallbackWorker } = require('./queues/fallbackWorker');
const logger = require('./utils/logger');

async function start() {
  await connectDB();

  scheduleTokenRefreshJob();

  let dmWorkerInstance;
  let fallbackWorkerInstance;

  // On Render, free tier background workers are not supported.
  // We start them inside the API server process so it works for free!
  if (process.env.RENDER === 'true') {
    logger.info('[server] Running on Render. Starting embedded queue workers...');
    try {
      dmWorkerInstance = startDmWorker();
      fallbackWorkerInstance = startFallbackWorker();
    } catch (err) {
      logger.error(`[server] Failed to start embedded queue workers: ${err.message}`);
    }
  }

  const server = app.listen(config.port, () => {
    logger.info(`[server] InstaFlow API listening on port ${config.port} (${config.env})`);
    if (process.env.RENDER !== 'true') {
      logger.info('[server] Reminder: run the queue workers as SEPARATE processes:');
      logger.info('[server]   npm run worker          (handles DM sending)');
      logger.info('[server]   npm run worker:fallback  (handles auto-reply fallback checks)');
    }
  });

  process.on('SIGTERM', async () => {
    logger.info('[server] SIGTERM received, shutting down');
    if (dmWorkerInstance) {
      logger.info('[server] Closing embedded DM worker...');
      await dmWorkerInstance.close();
    }
    if (fallbackWorkerInstance) {
      logger.info('[server] Closing embedded fallback worker...');
      await fallbackWorkerInstance.close();
    }
    server.close(() => process.exit(0));
  });
}

start().catch((err) => {
  logger.error(`[server] fatal startup error: ${err.message}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error(`[server] uncaught exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`[server] unhandled rejection at: ${promise} reason: ${reason}`);
  process.exit(1);
});
