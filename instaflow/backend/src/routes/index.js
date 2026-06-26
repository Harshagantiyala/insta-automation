const express = require('express');

const authRoutes = require('./authRoutes');
const webhookRoutes = require('./webhookRoutes');
const flowRoutes = require('./flowRoutes');
const accountRoutes = require('./accountRoutes');
const billingRoutes = require('./billingRoutes');

const router = express.Router();

router.use('/api/auth', authRoutes);
router.use('/api/flows', flowRoutes);
router.use('/api/instagram-accounts', accountRoutes);
router.use('/api/billing', billingRoutes);

// Mounted at the root (not under /api) to match the exact URL you register
// in the Meta App Dashboard: https://yourdomain.com/webhooks/instagram
router.use('/webhooks', webhookRoutes);

// Dev-only simulation routes — disabled in production by a guard inside the router
if (process.env.NODE_ENV !== 'production') {
  const devRoutes = require('./devRoutes');
  router.use('/api/dev', devRoutes);
}

module.exports = router;

