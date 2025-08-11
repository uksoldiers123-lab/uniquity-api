const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Basic middlewares
app.use(cors()); // optional; enable if you’re calling from a browser
app.use(express.json()); // important: parse JSON bodies

// Optional health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mock payment endpoint
app.post('/api/payments', (req, res) => {
  const { amount, currency, invoice } = req.body;

  if (amount == null || currency == null) {
    return res.status(400).json({ error: 'Missing amount or currency' });
  }

  const amt = Number(amount);
  if (Number.isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
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
