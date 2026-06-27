// Loads and validates environment variables in one place so the rest of the
// codebase never touches `process.env` directly.
require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[config] Missing strictly required environment variable in production: ${name}`);
    }
    // We don't throw here at import time for every var (so local dev without
    // Stripe/Meta keys can still boot the DB layer), but we warn loudly.
    console.warn(`[config] Missing environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  frontendUrl: (() => {
    const url = required('FRONTEND_URL', 'http://localhost:5173');
    return url === 'https://instaflow.onrender.com' ? 'https://instaflow-frontend.onrender.com' : url;
  })(),
  backendUrl: required('BACKEND_URL', 'http://localhost:4000'),

  databaseUrl: process.env.DATABASE_URL || required('MYSQL_URI', 'mysql://root:rootpassword@localhost:3306/instaflow'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  encryptionKey: required('ENCRYPTION_KEY'),

  meta: {
    appId: required('META_APP_ID'), // <-- INSERT META APP ID in your .env
    appSecret: required('META_APP_SECRET'), // <-- INSERT META APP SECRET in your .env
    oauthRedirectUri: required('META_OAUTH_REDIRECT_URI'),
    webhookVerifyToken: required('META_WEBHOOK_VERIFY_TOKEN'),
    graphVersion: process.env.META_GRAPH_API_VERSION || 'v20.0',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceIds: {
      starter: process.env.STRIPE_PRICE_ID_STARTER,
      pro: process.env.STRIPE_PRICE_ID_PRO,
    },
  },

  safety: {
    dmHourlyLimitPerAccount: parseInt(process.env.DM_HOURLY_LIMIT_PER_ACCOUNT || '200', 10),
    duplicateMessageWindowHours: parseInt(process.env.DUPLICATE_MESSAGE_WINDOW_HOURS ?? '24', 10),
  },
};
