# InstaFlow

Multi-tenant Instagram automation SaaS: comment-to-DM, DM auto-reply with fallback, and story-reply triggers, built on the Meta Graph API with a Redis/BullMQ-backed rate limiter that enforces a hard 200 DMs/hour ceiling per connected account.

## Architecture

```
instaflow/
├── backend/                  Node.js + Express API
│   └── src/
│       ├── config/           env, MySQL database, Redis connection factories
│       ├── controllers/      auth, webhook, flow, billing, account
│       ├── services/         metaApiService, tokenService, rateLimiterService,
│       │                     conversationStateService, encryptionService, stripeService
│       ├── models/           User, InstagramAccount, Flow, MessageLog
│       ├── routes/           route definitions, mounted in routes/index.js
│       ├── middleware/       auth, tenant isolation, webhook signature verification
│       ├── queues/           dmQueue + dmWorker, fallbackQueue + fallbackWorker
│       ├── jobs/              cron: token refresh sweep
│       ├── app.js / server.js
├── frontend/                 React + Vite + Tailwind dashboard
└── docker-compose.yml        MySQL, Redis, API, 2 workers, frontend
```

The API server and the two queue workers (`dm-worker`, `fallback-worker`) are
**separate processes** that all read the same codebase — this is what lets
the rate limiter and retry logic survive API server restarts/deploys.

## 1. Meta App setup (do this first)

1. Create an app at [developers.facebook.com](https://developers.facebook.com) with the **Instagram Graph API** and **Facebook Login** products added.
2. Under **App Settings > Basic**, copy your **App ID** and **App Secret** into `backend/.env` as `META_APP_ID` / `META_APP_SECRET`.
3. Under **Facebook Login > Settings**, add a Valid OAuth Redirect URI matching `META_OAUTH_REDIRECT_URI` in your `.env` (e.g. `https://yourdomain.com/api/auth/meta/callback`).
4. Under **Webhooks**, subscribe to the **Instagram** object, set the callback URL to `https://yourdomain.com/webhooks/instagram`, and choose a Verify Token — put that same string in `META_WEBHOOK_VERIFY_TOKEN`. Subscribe to the `comments`, `messages`, and `mentions` fields.
5. Request the `instagram_manage_messages`, `instagram_manage_comments`, `pages_manage_metadata`, and `pages_manage_engagement` permissions under **App Review** (these need Advanced Access for production use — sandbox/test users work without review).

## 2. Local setup

```bash
# Backend
cd backend
cp .env.example .env        # fill in META_APP_ID, META_APP_SECRET, ENCRYPTION_KEY, etc.
openssl rand -hex 32        # use this output as ENCRYPTION_KEY
npm install
npm run dev                 # API server on :4000

# In separate terminals:
npm run worker              # DM-send worker
npm run worker:fallback     # auto-reply fallback worker

# Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev                 # dashboard on :5173
```

Requires a local MySQL and Redis instance (or run `docker compose up mysql redis` from the repo root and point `MYSQL_URI`/`REDIS_URL` at `localhost`).

## 3. Docker

```bash
cp backend/.env.example backend/.env   # fill in real values first
docker compose up --build
```

This starts MySQL, Redis, the API, both workers, and the built frontend (served via nginx on port 5173).

## 4. How the rate limiter works

`services/rateLimiterService.js` uses a Redis `INCR` + `EXPIRE` (atomic via a small Lua script) keyed per Instagram account, capped at `DM_HOURLY_LIMIT_PER_ACCOUNT` (default 200). When a worker job hits the cap, it throws a `RateLimitError`, which a custom BullMQ backoff strategy (`queues/customBackoff.js`) catches to delay the retry **exactly** until the Redis key's TTL expires — not a generic exponential backoff. Duplicate-message protection works the same way with a separate per-recipient key and a 24-hour TTL.

## 5. Deploying

- **Railway**: create four services from this repo (api, dm-worker, fallback-worker, frontend) pointing at `backend/Dockerfile` (with different `command:` overrides matching docker-compose) and `frontend/Dockerfile`, plus a Railway-managed MySQL and Redis plugin. Set the same env vars as `backend/.env.example`.
- **AWS**: push the backend image to ECR, run api/dm-worker/fallback-worker as separate ECS services (or Fargate tasks) behind the same task definition with different `command` overrides, use RDS or Aurora for MySQL and ElastiCache for Redis.

## 6. Security notes

- Access tokens are AES-256-GCM encrypted at rest (`services/encryptionService.js`) — never stored in plaintext.
- Every tenant-scoped Sequelize query goes through `scopedFilter(req, ...)` (`middleware/tenantMiddleware.js`), which merges in `tenantId` automatically.
- Webhook POSTs are HMAC-SHA256 verified against the raw request body before any processing (`middleware/verifyWebhookSignature.js`).
- Stripe webhooks are verified the same way via the Stripe SDK's `constructEvent`.

## 7. Stripe billing

`services/stripeService.js` contains placeholder plan limits (`free` / `starter` / `pro`) and Checkout Session creation. Replace `STRIPE_PRICE_ID_STARTER` / `STRIPE_PRICE_ID_PRO` in `.env` with real Stripe Price IDs, and point a Stripe webhook endpoint at `/api/billing/webhook` with the events `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
