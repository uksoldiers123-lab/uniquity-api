const express = require('express');
const router = express.Router();
const requireAdmin = require('../../middleware/requireAdmin'); // adjust path if needed

// Apply admin guard to all routes in this router
router.use(requireAdmin);

router.get('/', (req, res) => {
  res.json({ ok: true, message: 'Admin area', user: req.user });
});

// Add more admin routes here
// e.g. router.get('/tenants', (req, res) => { ... });

module.exports = router;
