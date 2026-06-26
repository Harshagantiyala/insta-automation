const jwt = require('jsonwebtoken');

const config = require('../config/env');
const User = require('../models/User');
const InstagramAccount = require('../models/InstagramAccount');
const metaApiService = require('../services/metaApiService');
const encryptionService = require('../services/encryptionService');
const logger = require('../utils/logger');

function signJwt(user) {
  return jwt.sign({ sub: user.id.toString(), email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// ---------------------------------------------------------------------
// Dashboard auth (email/password) — the SaaS tenant's own login
// ---------------------------------------------------------------------

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ 
      name, 
      email, 
      passwordHash,
      subscriptionPlan: 'free',
      subscriptionStatus: 'trialing',
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    res.status(201).json({ token: signJwt(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email: (email || '').toLowerCase() } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ token: signJwt(user), user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------
// Meta OAuth — connecting an Instagram Business Account to a tenant
// ---------------------------------------------------------------------

/** GET /api/auth/meta/connect-url — returns the Facebook OAuth dialog URL for the logged-in tenant. */
function getMetaOAuthUrl(req, res) {
  // We encode the tenantId into `state` (signed) so the callback knows which
  // tenant to attach the connected IG account to, without relying on cookies.
  const state = jwt.sign({ tenantId: req.tenantId }, config.jwtSecret, { expiresIn: '10m' });
  const url = metaApiService.getOAuthDialogUrl(state);
  res.json({ url });
}

/** GET /api/auth/meta/callback — Meta redirects here after the user approves permissions. */
async function handleMetaOAuthCallback(req, res, next) {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      logger.warn(`[meta-oauth] user denied or error: ${error_description}`);
      return res.redirect(`${config.frontendUrl}/connect?status=denied`);
    }

    let decodedState;
    try {
      decodedState = jwt.verify(state, config.jwtSecret);
    } catch {
      return res.status(400).json({ error: 'Invalid or expired OAuth state' });
    }
    const tenantId = decodedState.tenantId;

    // 1. Exchange code -> short-lived user token -> long-lived user token.
    const shortLivedToken = await metaApiService.exchangeCodeForShortLivedToken(code);
    const { accessToken: longLivedUserToken, expiresInSeconds } =
      await metaApiService.getLongLivedToken(shortLivedToken);

    try {
      const axios = require('axios');
      const debugRes = await axios.get(`https://graph.facebook.com/debug_token`, {
        params: {
          input_token: longLivedUserToken,
          access_token: `${config.meta.appId}|${config.meta.appSecret}`
        }
      });
      logger.info(`[meta-oauth] token debug info: ${JSON.stringify(debugRes.data)}`);
    } catch (debugErr) {
      logger.error(`[meta-oauth] token debug failed: ${debugErr.message}`);
    }

    // 2. Find the Facebook Pages this user manages, and the IG Business
    //    Account linked to each (a user could have multiple — for an MVP we
    //    connect all of them; a future iteration could let the user pick).
    const pages = await metaApiService.getUserPages(longLivedUserToken);
    logger.info(`[meta-oauth] fetched pages: ${JSON.stringify(pages)}`);

    const connectedAccounts = [];
    for (const page of pages) {
      const igAccount = await metaApiService.getInstagramAccountForPage(page.id, page.access_token);
      logger.info(`[meta-oauth] page ${page.id} linked IG account: ${JSON.stringify(igAccount)}`);
      if (!igAccount) continue; // Page has no linked IG Business Account — skip

      const encryptedAccessToken = encryptionService.encrypt(page.access_token);

      const user = await User.findByPk(tenantId);
      const limits = require('../services/stripeService').getPlanLimits(user);
      const existingCount = await InstagramAccount.count({ where: { tenantId } });

      let saved = await InstagramAccount.findOne({
        where: { tenantId, igUserId: igAccount.id },
      });

      if (!saved && existingCount >= limits.accountsAllowed) {
        logger.warn(`[meta-oauth] skipped account ${igAccount.id} due to plan limit (${limits.accountsAllowed})`);
        continue;
      }
      const expiresSec = Number(expiresInSeconds) || (60 * 24 * 60 * 60);
      const accountData = {
        tenantId,
        igUserId: igAccount.id,
        igUsername: igAccount.username,
        facebookPageId: page.id,
        facebookPageName: page.name,
        encryptedAccessToken,
        tokenType: 'long_lived',
        tokenExpiresAt: new Date(Date.now() + expiresSec * 1000),
        isActive: true,
      };

      if (saved) {
        await saved.update(accountData);
      } else {
        saved = await InstagramAccount.create(accountData);
      }

      // 3. Subscribe the Page to webhooks so Meta starts sending us
      //    comments/messages/mentions for this account.
      try {
        await metaApiService.subscribePageToWebhooks(page.id, page.access_token);
        saved.webhookSubscribed = true;
        await saved.save();
      } catch (err) {
        const errMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        logger.error(`[meta-oauth] webhook subscription failed for page ${page.id}: ${errMsg}`);
      }

      connectedAccounts.push(saved.igUsername);
    }

    res.redirect(`${config.frontendUrl}/connect?status=success&accounts=${connectedAccounts.length}`);
  } catch (err) {
    logger.error(`[meta-oauth] callback error: ${err.message}`);
    res.redirect(`${config.frontendUrl}/connect?status=error`);
  }
}

module.exports = { register, login, getMetaOAuthUrl, handleMetaOAuthCallback };
