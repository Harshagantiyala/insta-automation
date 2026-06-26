const stripeService = require('../services/stripeService');
const User = require('../models/User');
const logger = require('../utils/logger');

async function createCheckoutSession(req, res, next) {
  try {
    const { plan } = req.body; // 'starter' | 'pro'
    if (!['starter', 'pro'].includes(plan)) {
      return res.status(400).json({ error: 'plan must be "starter" or "pro"' });
    }

    const user = await User.findByPk(req.tenantId);
    const checkoutUrl = await stripeService.createCheckoutSession(user, plan);
    res.json({ checkoutUrl });
  } catch (err) {
    next(err);
  }
}

async function getSubscriptionStatus(req, res, next) {
  try {
    const user = await User.findByPk(req.tenantId);
    res.json({ subscription: user.subscription, limits: stripeService.getPlanLimits(user.subscription.plan) });
  } catch (err) {
    next(err);
  }
}

/**
 * Stripe webhook endpoint. Mounted with raw-body parsing (see
 * routes/billingRoutes.js) since Stripe also requires HMAC signature
 * verification against the raw payload bytes, same principle as the Meta
 * webhook.
 */
async function handleStripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripeService.constructWebhookEvent(req.rawBody, signature);
  } catch (err) {
    logger.warn(`[stripe-webhook] signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook signature verification failed`);
  }

  try {
    await stripeService.handleWebhookEvent(event);
    res.sendStatus(200);
  } catch (err) {
    logger.error(`[stripe-webhook] handler error: ${err.message}`);
    res.sendStatus(500);
  }
}

module.exports = { createCheckoutSession, getSubscriptionStatus, handleStripeWebhook };
