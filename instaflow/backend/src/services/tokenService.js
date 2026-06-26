const { Op } = require('sequelize');
const metaApiService = require('./metaApiService');
const encryptionService = require('./encryptionService');
const InstagramAccount = require('../models/InstagramAccount');
const logger = require('../utils/logger');

const REFRESH_THRESHOLD_DAYS = 7; // refresh tokens expiring within this window

class TokenService {
  /**
   * Scans all active InstagramAccount docs whose token expires within
   * REFRESH_THRESHOLD_DAYS and refreshes them via Meta's fb_exchange_token
   * grant. Designed to be called from a daily cron (see jobs/tokenRefreshJob.js).
   */
  async refreshExpiringTokens() {
    const threshold = new Date(Date.now() + REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    const expiringAccounts = await InstagramAccount.findAll({
      where: {
        isActive: true,
        tokenExpiresAt: {
          [Op.lte]: threshold,
        },
      },
    });

    logger.info(`[tokenService] found ${expiringAccounts.length} account(s) needing token refresh`);

    const results = { refreshed: 0, failed: 0 };

    for (const account of expiringAccounts) {
      try {
        const currentToken = encryptionService.decrypt(account.encryptedAccessToken);
        const { accessToken, expiresInSeconds } = await metaApiService.refreshLongLivedToken(currentToken);
        const expiresSec = Number(expiresInSeconds) || (60 * 24 * 60 * 60);

        account.encryptedAccessToken = encryptionService.encrypt(accessToken);
        account.tokenExpiresAt = new Date(Date.now() + expiresSec * 1000);
        account.lastTokenRefreshAt = new Date();
        await account.save();

        results.refreshed++;
        logger.info(`[tokenService] refreshed token for IG account ${account.igUserId}`);
      } catch (err) {
        results.failed++;
        logger.error(`[tokenService] failed to refresh token for IG account ${account.igUserId}: ${err.message}`);

        // If Meta rejects the refresh outright (token already invalid), mark
        // the account inactive so the dashboard can prompt the user to
        // reconnect rather than silently failing every send.
        if (err.response?.status === 400 || err.response?.status === 401) {
          account.isActive = false;
          await account.save();
        }
      }
    }

    return results;
  }
}

module.exports = new TokenService();
