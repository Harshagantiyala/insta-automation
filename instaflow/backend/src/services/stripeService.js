const Stripe = require('stripe');
const config = require('../config/env');
const User = require('../models/User');
const logger = require('../utils/logger');

// Stripe SDK no-ops gracefully if the key is missing, so local dev without
// billing configured doesn't crash the whole server — but checkout/webhook
// calls will fail until you set STRIPE_SECRET_KEY.
const stripe = new Stripe(config.stripe.secretKey || 'sk_test_placeholder');

// Plan -> feature limits. Adjust to your actual pricing model.
const PLAN_LIMITS = {
  free: { flowsAllowed: 1, dmHourlyLimit: 20, accountsAllowed: 1 },
  trial: { flowsAllowed: 3, dmHourlyLimit: 100, accountsAllowed: 1 },
  starter: { flowsAllowed: 5, dmHourlyLimit: 100, accountsAllowed: 3 },
  pro: { flowsAllowed: Infinity, dmHourlyLimit: 200, accountsAllowed: Infinity },
};

class StripeService {
  /** Creates (or reuses) a Stripe Customer for a tenant. */
  async ensureStripeCustomer(user) {
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { tenantId: user.id.toString() },
    });

    user.stripeCustomerId = customer.id;
    await user.save();
    return customer.id;
  }

  /**
   * Creates a Stripe Checkout Session for upgrading to "starter" or "pro".
   * Replace `STRIPE_PRICE_ID_STARTER` / `STRIPE_PRICE_ID_PRO` in .env with
   * real Price IDs from your Stripe Dashboard > Products.
   */
  async createCheckoutSession(user, plan) {
    const priceId = config.stripe.priceIds[plan];
    if (!priceId) throw new Error(`No Stripe price configured for plan "${plan}"`);

    const customerId = await this.ensureStripeCustomer(user);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${config.frontendUrl}/billing?status=success`,
      cancel_url: `${config.frontendUrl}/billing?status=cancelled`,
      metadata: { tenantId: user.id.toString(), plan },
    });

    return session.url;
  }

  /**
   * Handles incoming Stripe Webhook events. Mount this behind raw-body
   * parsing + `stripe.webhooks.constructEvent` signature verification
   * (see controllers/billingController.js).
   */
  async handleWebhookEvent(event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { tenantId, plan } = session.metadata;
        
        const user = await User.findByPk(tenantId);
        if (user) {
          user.subscriptionPlan = plan;
          user.subscriptionStatus = 'active';
          user.stripeSubscriptionId = session.subscription;
          await user.save();
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const tenantId = subscription.metadata?.tenantId;
        if (tenantId) {
          const user = await User.findByPk(tenantId);
          if (user) {
            user.subscriptionStatus = subscription.status;
            user.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
            await user.save();
          }
        }
        break;
      }
      default:
        logger.info(`[stripe] unhandled event type: ${event.type}`);
    }
  }

  constructWebhookEvent(rawBody, signature) {
    return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  }

  getPlanLimits(planOrUser) {
    if (typeof planOrUser === 'string') {
      return PLAN_LIMITS[planOrUser] || PLAN_LIMITS.free;
    }

    if (planOrUser && planOrUser.subscriptionStatus === 'trialing') {
      if (planOrUser.currentPeriodEnd && new Date(planOrUser.currentPeriodEnd) > new Date()) {
        return PLAN_LIMITS.trial;
      }
      return PLAN_LIMITS.free; // Trial expired
    }

    const plan = planOrUser?.subscriptionPlan || 'free';
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  }
}

module.exports = new StripeService();
