const crypto = require('crypto');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Meta signs every webhook POST body with HMAC-SHA256 using your App
 * Secret, sent in the `X-Hub-Signature-256` header as `sha256=<hex>`.
 *
 * IMPORTANT: this requires the RAW request body bytes, not the parsed JSON
 * object (whitespace/key-order differences would break the HMAC). We use
 * `express.json({ verify })` on the webhook route (see routes/webhookRoutes.js)
 * to capture `req.rawBody` before parsing — this middleware just validates it.
 */
function verifyWebhookSignature(req, res, next) {
  const signatureHeader = req.headers['x-hub-signature-256'];

  if (!signatureHeader) {
    logger.warn('[webhook] missing X-Hub-Signature-256 header');
    return res.status(401).send('Missing signature header');
  }

  if (!req.rawBody) {
    logger.error('[webhook] req.rawBody not captured — check express.json verify hook');
    return res.status(500).send('Internal signature verification error');
  }

  const signingSecret = config.meta.webhookSigningSecret;
  logger.warn(`[webhook-debug] signingSecret length=${signingSecret.length}, first4="${signingSecret.substring(0,4)}", last4="${signingSecret.substring(signingSecret.length-4)}", rawBody length=${req.rawBody.length}`);
  const expectedSignature =
    'sha256=' + crypto.createHmac('sha256', signingSecret).update(req.rawBody).digest('hex');

  const isValid = timingSafeEqual(expectedSignature.toLowerCase(), (signatureHeader || '').toLowerCase());

  if (!isValid) {
    logger.warn('[webhook] invalid signature — ignoring old/invalid retry request.');
    return res.status(200).send('Invalid signature');
  }

  next();
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = verifyWebhookSignature;
