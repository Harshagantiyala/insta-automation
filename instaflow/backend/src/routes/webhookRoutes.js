const express = require('express');
const webhookController = require('../controllers/webhookController');
const verifyWebhookSignature = require('../middleware/verifyWebhookSignature');

const router = express.Router();

// Captures the exact raw bytes of the request body (needed for HMAC
// signature verification) while still parsing it into `req.body` for the
// controller to use.
const captureRawBody = express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
});

// Meta's one-time GET handshake when you register the webhook URL in the
// App Dashboard. No signature to verify here — it's just the verify_token.
router.get('/instagram', webhookController.verifyWebhookHandshake);

// Actual event delivery. Signature verification happens AFTER body capture
// but BEFORE the controller runs.
router.post('/instagram', captureRawBody, verifyWebhookSignature, webhookController.handleWebhookEvent);

module.exports = router;
