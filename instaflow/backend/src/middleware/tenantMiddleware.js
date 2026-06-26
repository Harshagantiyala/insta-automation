/**
 * Multi-tenant safety net. Must run AFTER authMiddleware.
 *
 * This doesn't do anything fancy by itself — the real isolation happens
 * because every Sequelize model that holds tenant data has a `tenantId`
 * field, and every controller is required to use `scopedFilter(req, {...})`
 * below instead of building raw `{...}` filters. This middleware just makes
 * `req.tenantId` available everywhere and fails closed if it's missing.
 */
function tenantMiddleware(req, res, next) {
  if (!req.user || !req.user.tenantId) {
    return res.status(401).json({ error: 'Unable to resolve tenant from authentication token' });
  }
  req.tenantId = req.user.tenantId;
  next();
}

/**
 * Helper to merge tenantId into any Sequelize filter object, used in every
 * controller that touches tenant-scoped models (InstagramAccount, Flow,
 * MessageLog). This is the single chokepoint that prevents cross-tenant
 * data leaks — never call `Model.findAll({...})` directly with user-supplied
 * filters in a controller without passing it through this.
 */
function scopedFilter(req, filter = {}) {
  return { ...filter, tenantId: req.tenantId };
}

module.exports = { tenantMiddleware, scopedFilter };
