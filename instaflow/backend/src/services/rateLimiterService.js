const { sharedConnection: redis } = require('../config/redis');
const config = require('../config/env');

const HOUR_MS = 60 * 60 * 1000;

/**
 * Enforces two safety rules per Instagram account:
 *  1. Hard cap of N DMs/hour (default 200) using a fixed Redis window that
 *     resets exactly on the hour boundary the FIRST message in that window
 *     was sent — not a rolling "now minus 1h" window, so callers can compute
 *     a precise "resume at" timestamp for delayed jobs.
 *  2. No duplicate DM to the same recipient within X hours (default 24h).
 */
class RateLimiterService {
  constructor() {
    this.hourlyLimit = config.safety.dmHourlyLimitPerAccount;
    this.duplicateWindowSeconds = config.safety.duplicateMessageWindowHours * 3600;
  }

  _hourlyCounterKey(igAccountId) {
    return `ratelimit:dm:${igAccountId}:count`;
  }

  _duplicateKey(igAccountId, recipientIgId) {
    return `ratelimit:dup:${igAccountId}:${recipientIgId}`;
  }

  /**
   * Atomically checks + increments the hourly counter for an account.
   * Returns { allowed: true } if the message can be sent now, or
   * { allowed: false, resumeAt: <Date> } if the hourly cap has been hit.
   */
  async checkAndIncrementHourlyLimit(igAccountId) {
    const key = this._hourlyCounterKey(igAccountId);

    // Lua script: INCR the counter; if it's the first increment in this
    // window, also set a TTL of 1 hour. This avoids a race between
    // "check count" and "set expiry" across two separate round trips.
    const luaScript = `
      local current = redis.call("INCR", KEYS[1])
      if current == 1 then
        redis.call("EXPIRE", KEYS[1], ARGV[1])
      end
      local ttl = redis.call("TTL", KEYS[1])
      return {current, ttl}
    `;

    const [count, ttlSeconds] = await redis.eval(luaScript, 1, key, 3600);

    if (count > this.hourlyLimit) {
      const resumeAt = new Date(Date.now() + ttlSeconds * 1000);
      return { allowed: false, resumeAt, currentCount: count };
    }

    return { allowed: true, currentCount: count };
  }

  /** Call this if a queued send ultimately fails/is skipped, to give back the slot. */
  async decrementHourlyCounter(igAccountId) {
    const key = this._hourlyCounterKey(igAccountId);
    const current = await redis.decr(key);
    if (current < 0) await redis.set(key, 0, 'EX', 3600);
  }

  /**
   * Returns true if we've already sent a DM to this recipient (from this IG
   * account) within the configured duplicate-prevention window.
   */
  async hasRecentMessage(igAccountId, recipientIgId) {
    if (this.duplicateWindowSeconds <= 0) return false;
    const exists = await redis.exists(this._duplicateKey(igAccountId, recipientIgId));
    return exists === 1;
  }

  /** Marks that a DM was just sent, starting the duplicate-prevention timer. */
  async markMessageSent(igAccountId, recipientIgId) {
    if (this.duplicateWindowSeconds <= 0) return;
    await redis.set(
      this._duplicateKey(igAccountId, recipientIgId),
      Date.now(),
      'EX',
      this.duplicateWindowSeconds
    );
  }

  /** Milliseconds until the current hourly window resets (for BullMQ delay calculations). */
  async getMsUntilWindowReset(igAccountId) {
    const ttlSeconds = await redis.ttl(this._hourlyCounterKey(igAccountId));
    return ttlSeconds > 0 ? ttlSeconds * 1000 : HOUR_MS;
  }
}

module.exports = new RateLimiterService();
