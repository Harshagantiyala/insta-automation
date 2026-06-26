const Flow = require('../models/Flow');
const InstagramAccount = require('../models/InstagramAccount');
const User = require('../models/User');
const stripeService = require('../services/stripeService');
const { scopedFilter } = require('../middleware/tenantMiddleware');

async function listFlows(req, res, next) {
  try {
    const flows = await Flow.findAll({
      where: scopedFilter(req),
      order: [['createdAt', 'DESC']],
    });
    res.json({ flows });
  } catch (err) {
    next(err);
  }
}

async function createFlow(req, res, next) {
  try {
    // Enforce plan-based flow limits before creating.
    const user = await User.findByPk(req.tenantId);
    const limits = stripeService.getPlanLimits(user);
    const existingCount = await Flow.count({ where: scopedFilter(req) });

    if (existingCount >= limits.flowsAllowed) {
      return res.status(403).json({
        error: `Your "${user.subscription.plan}" plan allows up to ${limits.flowsAllowed} flow(s). Upgrade to add more.`,
      });
    }

    const { instagramAccountId, name, trigger, action, fallback } = req.body;

    // Verify the IG account belongs to this tenant (defense-in-depth beyond scopedFilter).
    const account = await InstagramAccount.findOne({ where: { id: instagramAccountId, tenantId: req.tenantId } });
    if (!account) return res.status(404).json({ error: 'Instagram account not found for this tenant' });

    const flow = await Flow.create({
      tenantId: req.tenantId,
      instagramAccountId,
      name,
      trigger,
      action,
      fallback,
    });

    res.status(201).json({ flow });
  } catch (err) {
    next(err);
  }
}

async function updateFlow(req, res, next) {
  try {
    const flow = await Flow.findOne({ where: scopedFilter(req, { id: req.params.id }) });
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    
    const { name, trigger, action, fallback, isActive } = req.body;
    await flow.update({ name, trigger, action, fallback, isActive });
    res.json({ flow });
  } catch (err) {
    next(err);
  }
}

async function deleteFlow(req, res, next) {
  try {
    const flow = await Flow.findOne({ where: scopedFilter(req, { id: req.params.id }) });
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    
    await flow.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listFlows, createFlow, updateFlow, deleteFlow };
