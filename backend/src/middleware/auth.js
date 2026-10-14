const db = require('../database/jsonDb');

function mockAuth(req, res, next) {
  // Support custom header for demo role-switching, or fallback to current user
  const userId = req.headers['x-user-id'] || 'emp-101';
  const employee = db.getById('employees', userId);

  if (employee) {
    req.user = employee;
  } else {
    req.user = {
      id: 'emp-101',
      name: 'Abhishek Hengade',
      role: 'Lead Systems Architect',
      department: 'Engineering',
      email: 'abhishek@nexusoffice.io'
    };
  }
  next();
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role) && req.user.role !== 'Chief Executive Officer') {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}

module.exports = {
  mockAuth,
  requireRole
};
