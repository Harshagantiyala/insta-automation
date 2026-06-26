const express = require('express');
const billingController = require('../controllers/billingController');
const authMiddleware = require('../middleware/authMiddleware');
const { tenantMiddleware } = require('../middleware/tenantMiddleware');

const router = express.Router();

router.post('/checkout-session', authMiddleware, tenantMiddleware, billingController.createCheckoutSession);
router.get('/subscription', authMiddleware, tenantMiddleware, billingController.getSubscriptionStatus);

// Stripe webhook — public endpoint, verified via signature instead of JWT.
// Raw body capture mirrors the same pattern used for the Meta webhook.
router.post(
  '/webhook',
  express.raw({ type: 'application/json', verify: (req, _res, buf) => (req.rawBody = buf) }),
  billingController.handleStripeWebhook
);

module.exports = router;
