const InstagramAccount = require('../models/InstagramAccount');
const MessageLog = require('../models/MessageLog');
const Flow = require('../models/Flow');
const { scopedFilter } = require('../middleware/tenantMiddleware');
const encryptionService = require('../services/encryptionService');
const metaApiService = require('../services/metaApiService');
const crypto = require('crypto');

async function listAccounts(req, res, next) {
  try {
    const accounts = await InstagramAccount.findAll({
      where: scopedFilter(req),
      attributes: { exclude: ['encryptedAccessToken'] },
    });
    res.json({ accounts });
  } catch (err) {
    next(err);
  }
}

async function disconnectAccount(req, res, next) {
  try {
    const account = await InstagramAccount.findOne({
      where: scopedFilter(req, { id: req.params.id }),
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    
    // Delete associated message logs first due to foreign key constraints
    await MessageLog.destroy({ where: { instagramAccountId: account.id } });
    await Flow.destroy({ where: { instagramAccountId: account.id } });
    
    await account.destroy();
    res.json({ success: true, message: 'Account and associated data deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

async function connectCredentials(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await require('../models/User').findByPk(req.tenantId);
    const limits = require('../services/stripeService').getPlanLimits(user);
    const existingCount = await InstagramAccount.count({ where: scopedFilter(req) });
    if (existingCount >= limits.accountsAllowed) {
      return res.status(403).json({
        error: `Your plan allows up to ${limits.accountsAllowed} Instagram account(s). Upgrade to add more.`,
      });
    }

    // Since Meta does not allow raw credential login for Graph API, we mock the connection
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const igUserId = 'ig_mock_' + crypto.randomBytes(6).toString('hex');
    const facebookPageId = 'page_mock_' + crypto.randomBytes(6).toString('hex');
    const mockToken = 'mock_access_token_' + crypto.randomBytes(16).toString('hex');
    const encryptedAccessToken = encryptionService.encrypt(mockToken);

    const account = await InstagramAccount.create({
      tenantId: req.tenantId,
      igUserId,
      igUsername: cleanUsername,
      facebookPageId,
      facebookPageName: `${cleanUsername} Mock Page`,
      encryptedAccessToken,
      tokenType: 'long_lived',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      isActive: true,
      webhookSubscribed: true,
    });

    res.status(201).json({ success: true, account });
  } catch (err) {
    next(err);
  }
}

async function getAccountMedia(req, res, next) {
  try {
    const account = await InstagramAccount.findOne({
      where: scopedFilter(req, { id: req.params.id }),
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const accessToken = encryptionService.decrypt(account.encryptedAccessToken);
    const media = await metaApiService.getInstagramMedia(account.igUserId, accessToken, account.igUsername);
    res.json({ media });
  } catch (err) {
    next(err);
  }
}

async function listLogs(req, res, next) {
  try {
    const logs = await MessageLog.findAll({
      where: scopedFilter(req),
      order: [['createdAt', 'DESC']],
      limit: 20,
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAccounts, disconnectAccount, connectCredentials, getAccountMedia, listLogs };
