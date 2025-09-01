
const express = require('express');
const router = express.Router();
const requireAdmin = require('../../middleware/requireAdmin');

router.use(requireAdmin);

router.get('/', (req, res) => {
  res.json({ ok: true, message: 'Admin area', user: req.user });
});

module.exports = router;

const jwt = require('jsonwebtoken'); // or your preferred token lib

// Replace with your real secret/public verification
const SECRET = process.env.JWT_SECRET || 'your-secret';

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, SECRET);
    // Expect payload.role or payload.permissions
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Attach user info if needed
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireAdmin };

// Mount Admin API
app.use('/admin', adminRoutes);

// Health
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});

