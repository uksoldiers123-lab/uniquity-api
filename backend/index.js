require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Stripe = require('stripe');
const app = express();
const port = process.env.PORT || 3000;

// Initialize Stripe with your secret key
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '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
';
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

app.use(bodyParser.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// In-memory client data (replace with your DB)
const clients = {
  'CLI-001': {
    clientCode: 'CLI-001',
    connected_account_id: 'acct_live_example', // Stripe Connect destination
    fee_percent: 0.10, // 10%
    fee_fixed_cents: 0
  },
  // Add more clients as needed
};

// Helper: find client by code
function getClientRowByCode(code) {
  return clients[code] || null;
}

// POST /api/create-payment-intent-for-client
app.post('/api/create-payment-intent-for-client', async (req, res) => {
  const { amount, currency = 'usd', clientCode, description, receipt_email, billing_details } = req.body;

  // Basic validation
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const clientRow = getClientRowByCode(clientCode);
    if (!clientRow) {
      return res.status(400).json({ error: 'Unknown client' });
    }

    const connected_account_id = clientRow.connected_account_id;
    if (!connected_account_id) {
      return res.status(400).json({ error: 'Client not configured for Connect' });
    }

    // Fees calculation
    const percent = Number(clientRow.fee_percent) || 0;
    const fixed = Number(clientRow.fee_fixed_cents) || 0;
    const application_fee_amount = Math.round(amount * percent) + fixed;

    const piParams = {
      amount,
      currency,
      description,
      receipt_email,
      payment_method_types: ['card'],
      transfer_data: { destination: connected_account_id },
      application_fee_amount,
      metadata: { clientCode, description, connected_account_id }
    };

    // If billing_details provided, attach to payment intent (Stripe accepts this field on create)
    if (billing_details) {
      piParams.billing_details = billing_details;
    }

    const pi = await stripe.paymentIntents.create(piParams);

    res.json({ clientSecret: pi.client_secret });
  } catch (e) {
    console.error('Error creating PaymentIntent-for-client:', e);
    res.status(500).json({ error: e.message });
  }
});

// Simple health-check
app.get('/health', (req, res) => res.json({ ok: true }));

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
