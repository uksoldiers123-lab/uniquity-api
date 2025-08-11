const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Basic middlewares
app.use(cors()); // enable if you’re calling from a browser
app.use(express.json()); // parse JSON bodies

// Health check (optional)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mock payment endpoint
app.post('/api/payments', (req, res) => {
  console.log('[MOCK] /api/payments called', { body: req.body, headers: req.headers });

  const { amount, currency, invoice } = req.body;

  if (amount == null || currency == null) {
    const msg = 'Missing amount or currency';
    console.error('[MOCK] error', msg);
    return res.status(400).json({ error: msg });
  }

  const amt = Number(amount);
  if (Number.isNaN(amt) || amt <= 0) {
    const msg = 'Invalid amount';
    console.error('[MOCK] error', msg);
    return res.status(400).json({ error: msg });
  }

  const response = {
    id: 'mock_' + Date.now(),
    amount: amt,
    currency: String(currency).toLowerCase(),
    invoice: invoice || null,
    status: 'succeeded',
    message: 'This is a mock payment'
  };

  res.json(response);
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Mock payment server listening on ${port}`));
