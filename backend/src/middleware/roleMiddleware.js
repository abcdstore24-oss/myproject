/**
 * Role Middleware
 *
 * org_owner is treated as a superset of recruiter within their org.
 * All routes that allow 'recruiter' also allow 'org_owner' so org owners
 * can create/manage tests, view reports, etc. without a separate flow.
 */

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (!allowedRoles.includes(req.userRole)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions.',
      requiredRole: allowedRoles,
      yourRole: req.userRole,
    });
  }
  next();
};

// Org owner has all recruiter capabilities
const recruiterOnly = (req, res, next) =>
  authorize('recruiter', 'org_owner')(req, res, next);

const adminOnly = (req, res, next) =>
  authorize('admin')(req, res, next);

const candidateOnly = (req, res, next) =>
  authorize('candidate')(req, res, next);

// Admin can see everything; recruiter and org_owner can access their own org's data
const adminOrRecruiter = (req, res, next) =>
  authorize('admin', 'recruiter', 'org_owner')(req, res, next);

// Org owner only — for team/invite management
const orgOwnerOnly = (req, res, next) =>
  authorize('org_owner')(req, res, next);

module.exports = {
  authorize,
  adminOnly,
  recruiterOnly,
  candidateOnly,
  adminOrRecruiter,
  orgOwnerOnly,
};