const IORedis = require('ioredis');
const config = require('./env');
const logger = require('../utils/logger');

/**
 * BullMQ recommends a fresh ioredis connection per Queue/Worker/QueueEvents
 * instance (especially Workers, which issue blocking commands). We expose a
 * factory instead of a single shared singleton.
 *
 * `maxRetriesPerRequest: null` is REQUIRED by BullMQ workers, otherwise
 * blocking BRPOPLPUSH-style commands can throw under reconnects.
 */
function createRedisConnection(label = 'default') {
  const connection = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  connection.on('error', (err) => logger.error(`[redis:${label}] ${err.message}`));
  connection.on('connect', () => logger.info(`[redis:${label}] connected`));

  return connection;
}

// A general-purpose connection for simple GET/SET/INCR rate-limit operations
// (not used for BullMQ blocking ops), safe to share.
const sharedConnection = createRedisConnection('shared');

module.exports = { createRedisConnection, sharedConnection };
