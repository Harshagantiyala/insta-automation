const express = require('express');
const flowController = require('../controllers/flowController');
const authMiddleware = require('../middleware/authMiddleware');
const { tenantMiddleware } = require('../middleware/tenantMiddleware');
const { validateBody } = require('../middleware/validateMiddleware');
const { createFlowSchema } = require('../utils/schemas');

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', flowController.listFlows);
router.post('/', validateBody(createFlowSchema), flowController.createFlow);
router.patch('/:id', flowController.updateFlow);
router.delete('/:id', flowController.deleteFlow);

module.exports = router;
