
const express = require('express');
const router = express.Router();
const requireAdmin = require('../../middleware/requireAdmin');

router.use(requireAdmin);

router.get('/', (req, res) => {
  res.json({ ok: true, message: 'Admin area', user: req.user });
});

// Add more admin routes as needed
module.exports = router;
