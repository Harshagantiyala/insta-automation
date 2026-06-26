const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

// General API rate limiting (separate from the per-IG-account DM rate
// limiter in services/rateLimiterService.js — this one protects OUR api
// from abuse, not Meta's DM limits).
app.use(
  '/api',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false })
);

// NOTE: /webhooks/instagram and /api/billing/webhook intentionally do their
// OWN body parsing (raw body capture for signature verification) inside
// their route files — they must NOT be double-parsed by a global
// express.json() here, or the raw bytes needed for HMAC verification will
// already be consumed/altered.
app.use((req, res, next) => {
  if (req.path.startsWith('/webhooks/') || req.path === '/api/billing/webhook') {
    return next();
  }
  express.json()(req, res, next);
});

app.get('/health', (req, res) => res.json({ status: 'ok', env: config.env }));

app.use(routes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
