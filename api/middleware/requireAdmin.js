
const requireAuth = require('./requireAuth');

function requireAdmin(req, res, next) {
  // If you’re using JWT payload, ensure role field exists
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}

module.exports = (req, res, next) => {
  // Ensure user is authenticated first
  requireAuth(req, res, () => {
    // Then check admin role
    const user = req.user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
};
