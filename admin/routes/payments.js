const express = require('express');
const router = express.Router();

// List payments (stub)
router.get('/', (req, res) => {
  res.json({ ok: true, payments: [] });
});

// Per-client payments
router.get('/:clientCode', (req, res) => {
  const { clientCode } = req.params;
  res.json({ ok: true, clientCode, payments: [] });
});

module.exports = router;
