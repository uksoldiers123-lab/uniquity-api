const express = require('express');
const router = express.Router();

// Mount sub-routers
router.use('/merchants', require('./merchants'));
router.use('/payments', require('./payments'));

router.get('/', (req, res) => {
  res.json({ ok: true, msg: 'Admin API' });
});

module.exports = router;

backend/admin/routes/merchants.js
const express = require('express');
const router = express.Router();

// Simple in-memory stub for creating a merchant
router.post('/', (req, res) => {
  // Expect: { clientCode, name, email, onBoardingAlso: ... }
  const { clientCode, name, email } = req.body || {};
  if (!clientCode || !name) {
    return res.status(400).json({ error: 'clientCode and name required' });
  }

  // In production, create Stripe Connect account and store in Supabase
  const created = {
    clientCode,
    connect_id: 'acct_connect_stub_' + clientCode,
    name,
    email,
    status: 'onboarded',
  };

  res.json({ ok: true, merchant: created });
});

module.exports = router;

backend/admin/routes/payments.js
const express = require('express');
const router = express.Router();

// Simple endpoint to fetch payments (stub)
router.get('/', (req, res) => {
  // In production, fetch from Supabase
  res.json({ ok: true, payments: [] });
});

router.get('/:clientCode', (req, res) => {
  const { clientCode } = req.params;
  res.json({ ok: true, clientCode, payments: [] });
});

module.exports = router;
