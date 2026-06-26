const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { tenantMiddleware } = require('../middleware/tenantMiddleware');
const { validateBody } = require('../middleware/validateMiddleware');
const { registerSchema, loginSchema } = require('../utils/schemas');

const router = express.Router();

// Dashboard email/password auth
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);

// Meta OAuth (connecting an Instagram Business Account)
// Requires the tenant to already be logged in to InstaFlow. Returns JSON
// (not a redirect) so the frontend can issue the navigation itself with the
// JWT already attached to this request.
router.get('/meta/connect-url', authMiddleware, tenantMiddleware, authController.getMetaOAuthUrl);

// Public callback — Meta redirects here directly, no Authorization header.
// Tenant identity is recovered from the signed `state` param instead.
router.get('/meta/callback', authController.handleMetaOAuthCallback);

module.exports = router;
