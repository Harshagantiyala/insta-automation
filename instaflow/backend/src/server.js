const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');
const scheduleTokenRefreshJob = require('./jobs/tokenRefreshJob');
const logger = require('./utils/logger');

async function start() {
  await connectDB();

  scheduleTokenRefreshJob();

  const server = app.listen(config.port, () => {
    logger.info(`[server] InstaFlow API listening on port ${config.port} (${config.env})`);
    logger.info('[server] Reminder: run the queue workers as SEPARATE processes:');
    logger.info('[server]   npm run worker          (handles DM sending)');
    logger.info('[server]   npm run worker:fallback  (handles auto-reply fallback checks)');
  });

  process.on('SIGTERM', () => {
    logger.info('[server] SIGTERM received, shutting down');
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
