const cron = require('node-cron');
const tokenService = require('../services/tokenService');
const logger = require('../utils/logger');

/**
 * Runs once a day at 03:00 server time. Long-lived tokens last ~60 days, so
 * a daily sweep with a 7-day lookahead (see tokenService) gives plenty of
 * margin even if a run or two is missed.
 */
function scheduleTokenRefreshJob() {
  cron.schedule('0 3 * * *', async () => {
    logger.info('[cron] starting scheduled token refresh sweep');
    try {
      const result = await tokenService.refreshExpiringTokens();
      logger.info(`[cron] token refresh sweep complete: ${JSON.stringify(result)}`);
    } catch (err) {
      logger.error(`[cron] token refresh sweep failed: ${err.message}`);
    }
  });

  logger.info('[cron] token refresh job scheduled (daily at 03:00)');
}

module.exports = scheduleTokenRefreshJob;
