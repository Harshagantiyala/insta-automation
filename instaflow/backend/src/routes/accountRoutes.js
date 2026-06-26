const express = require('express');
const accountController = require('../controllers/accountController');
const authMiddleware = require('../middleware/authMiddleware');
const { tenantMiddleware } = require('../middleware/tenantMiddleware');

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', accountController.listAccounts);
router.get('/logs', accountController.listLogs);
router.get('/:id/media', accountController.getAccountMedia);
router.post('/connect-credentials', accountController.connectCredentials);
router.delete('/:id', accountController.disconnectAccount);

module.exports = router;
