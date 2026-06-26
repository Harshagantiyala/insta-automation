const { sharedConnection: redis } = require('../config/redis');

/**
 * Tracks, per (igAccount, recipient) pair, the timestamp of the last
 * OUTBOUND message — whether sent by a human agent through the Instagram
 * app directly, or by InstaFlow's automation. Meta's webhook delivers a
 * `messaging` event with `is_echo: true` any time the connected Page/IG
 * account sends a message, regardless of who/what sent it — which is
 * exactly the signal we need to decide "has this conversation already been
 * handled?" before firing an auto-reply fallback.
 */
class ConversationStateService {
  _key(igAccountId, recipientIgId) {
    return `conv:${igAccountId}:${recipientIgId}:lastOutboundAt`;
  }

  async markOutbound(igAccountId, recipientIgId, timestampMs = Date.now()) {
    // 24h TTL is generous headroom — fallback windows are typically minutes/hours, not days.
    await redis.set(this._key(igAccountId, recipientIgId), timestampMs, 'EX', 86400);
  }

  async getLastOutboundAt(igAccountId, recipientIgId) {
    const value = await redis.get(this._key(igAccountId, recipientIgId));
    return value ? parseInt(value, 10) : null;
  }
}

module.exports = new ConversationStateService();
