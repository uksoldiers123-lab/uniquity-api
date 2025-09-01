
const requireAuth = require('../middleware/requireAuth');
const express = require('express');
const router = express.Router();

router.get('/client-data', requireAuth, (req, res) => {
  // req.user is available
  res.json({ ok: true, data: 'client data', user: req.user });
});

module.exports = router;
