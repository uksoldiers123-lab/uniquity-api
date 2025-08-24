const express = require('express');
const router = express.Router();

// Simple payouts endpoint placeholder
router.get('/', (req, res) => {
  res.json({ ok: true, payouts: [] });
});

// Create a payout example (stub)
router.post('/create', (req, res) => {
  const { clientCode, amount } = req.body || {};
  if (!clientCode || !amount) {
    return res.status(400).json({ error: 'clientCode and amount required' });
  }
  res.json({ ok: true, payout: { clientCode, amount, id: 'po_' + Date.now() } });
});

module.exports = router;
