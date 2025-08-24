const express = require('express');
const router = express.Router();

// Create merchant stub
router.post('/', (req, res) => {
  const { clientCode, name, email } = req.body || {};
  if (!clientCode || !name) {
    return res.status(400).json({ error: 'clientCode and name are required' });
  }

  // In production, create Stripe Connect account and persist in DB
  const merchant = {
    clientCode,
    connect_id: 'acct_connect_' + clientCode,
    name,
    email,
    status: 'onboarded',
  };

  res.json({ ok: true, merchant });
});

// Get merchants (stub)
router.get('/', (req, res) => {
  res.json({ ok: true, merchants: [] });
});

module.exports = router;
