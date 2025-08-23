require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const app = express();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // Use sk_live_... for production

app.use(express.json());

// CORS: Allow your frontend domain(s)
const FRONTEND_ORIGINS = [
  'https://uniquitysolutions.com',
  'https://www.uniquitysolutions.com',
  'https://dashboard.uniquitysolutions.com'
];
app.use(cors({
  origin: FRONTEND_ORIGINS,
  credentials: true
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Legacy: existing simple PaymentIntent endpoint
// POST /api/create-payment-intent
// Body: { amount: <in cents>, currency: "usd", description: "...", metadata: { ... } }
app.post('/api/create-payment-intent', async (req, res) => {
  const { amount, currency = 'usd', description, metadata } = req.body;
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  try {
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      metadata,
      payment_method_types: ['card']
    });
    res.json({ clientSecret: pi.client_secret });
  } catch (err) {
    console.error('Error creating PaymentIntent:', err);
    res.status(500).json({ error: err.message });
  }
});

// NEW: Connect-aware endpoint
// POST /api/create-payment-intent-for-client
// Body: { amount, currency, clientId, description, receipt_email }
async function getConnectedAccountForClient(clientId) {
  // Replace this with your real DB lookup to map clientId to connected_account_id
  // Example: return { connected_account_id: 'acct_1ABC12345' };
  if (!clientId) throw new Error('clientId required');
  // TODO: replace with actual mapping
  return { connected_account_id: 'acct_1ExampleConnected', clientName: 'Example Client' };
}
async function logPaymentToSupabase(clientId, amount, currency, paymentIntentId, receipt_email, description) {
  // Optional: wire up Supabase server-side logging here if you want
  // const { createClient } = require('@supabase/supabase-js');
  // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  // await supabase.from('payments').insert([{...}]);
  return;
}

app.post('/api/create-payment-intent-for-client', async (req, res) => {
  const { amount, currency = 'usd', clientId, description, receipt_email } = req.body;
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  try {
    const { connected_account_id } = await getConnectedAccountForClient(clientId);
    if (!connected_account_id) {
      return res.status(400).json({ error: 'Unknown client' });
    }

    // Platform fee (in cents). Customize as needed
    const application_fee_amount = Math.round(amount * 0.10); // 10% platform fee

    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      receipt_email,
      payment_method_types: ['card'],
      transfer_data: {
        destination: connected_account_id,
        // If you want to ensure the client receives amount - app fee, uncomment:
        // amount: Math.max(0, amount - application_fee_amount),
      },
      application_fee_amount,
      metadata: { clientId, description },
    });

    // Optional: log to Supabase
    await logPaymentToSupabase(clientId, amount, currency, pi.id, receipt_email, description);

    res.json({ clientSecret: pi.client_secret });
  } catch (e) {
    console.error('Error creating PaymentIntent-for-client:', e);
    res.status(500).json({ error: e.message });
  }
});

// Optional: webhook endpoint for reconciliation (not shown) 
// app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => { ... });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
