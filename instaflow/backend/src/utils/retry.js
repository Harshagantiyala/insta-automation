const logger = require('./logger');

/**
 * Retries an async function with exponential backoff + jitter.
 * Used to wrap Meta Graph API calls so transient outages (5xx, ECONNRESET,
 * 429s without a Retry-After we can trust) don't immediately fail a job.
 *
 * @param {Function} fn - async function to execute
 * @param {Object} opts
 * @param {number} opts.retries - max attempts (default 3)
 * @param {number} opts.baseDelayMs - base delay before first retry (default 500ms)
 * @param {Function} opts.shouldRetry - (error) => boolean, decide if retryable
 */
async function withRetry(fn, opts = {}) {
  const { retries = 3, baseDelayMs = 500, shouldRetry = defaultShouldRetry } = opts;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === retries;
      if (isLastAttempt || !shouldRetry(err)) {
        throw err;
      }
      const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 200);
      logger.warn(`[retry] attempt ${attempt + 1} failed, retrying in ${delay}ms: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

function defaultShouldRetry(err) {
  // Retry on network errors or 5xx / 429 responses from Meta's Graph API.
  if (!err.response) return true; // network-level failure (ECONNRESET, timeout, etc.)
  const status = err.response.status;
  return status === 429 || (status >= 500 && status < 600);
}

module.exports = { withRetry };
