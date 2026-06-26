const rateLimiterService = require('../services/rateLimiterService');

/**
 * BullMQ calls this when a job throws and its jobOptions specify
 * `backoff: { type: 'custom' }`. We inspect WHY the job failed:
 *  - RateLimitError -> delay precisely until the Redis window resets.
 *  - anything else  -> standard exponential backoff.
 *
 * Registered on the Worker via `settings.backoffStrategy`.
 */
function buildCustomBackoffStrategy() {
  return async function backoffStrategy(attemptsMade, type, err, job) {
    if (err && err.name === 'RateLimitError') {
      const msUntilReset = await rateLimiterService.getMsUntilWindowReset(job.data.igAccountId);
      // Add a small buffer so we don't race the exact expiry instant.
      return msUntilReset + 2000;
    }

    // Default exponential backoff for genuine API errors (e.g. transient 5xx
    // that survived the in-service `withRetry` already, token expired, etc.)
    return Math.min(2 ** attemptsMade * 1000, 60_000);
  };
}

class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
  }
}

module.exports = { buildCustomBackoffStrategy, RateLimitError };
