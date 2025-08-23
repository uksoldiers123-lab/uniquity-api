require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.use(express.json());

// CORS for frontend domains
const FRONTEND_ORIGINS = [
  'https://uniquitysolutions.com',
  'https://www.uniquitysolutions.com',
  'https://dashboard.uniquitysolutions.com'
];
app.use(cors({ origin: FRONTEND_ORIGINS, credentials: true }));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Legacy: existing simple PaymentIntent endpoint
// POST /api/create-payment-intent
// Body: { amount (in cents), currency, description, metadata }
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

// Helper: map clientCode -> connected_account_id and per-client fees from Supabase
async function getClientRow(clientCode) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, client_code, name, connected_account_id, email, fee_percent, fee_fixed_cents, tenant_id')
    .eq('client_code', clientCode)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Unknown client');
  return data;
}

async function logPaymentToSupabase(clientCode, amount, currency, paymentIntentId, receipt_email, description) {
  // Optional: log to payments table (adjust fields as needed)
  const { data, error } = await supabase.from('payments').insert([
    {
      // client_id: <set after you fetch client row>,
      amount,
      currency,
      payment_intent_id: paymentIntentId,
      payer_email: receipt_email,
      description,
      status: 'pending',
      created_at: new Date().toISOString(),
      metadata: { clientCode, description }
    }
  ]);
  if (error) console.error('Supabase insert error:', error);
  return data;
}

// NEW: Connect-aware endpoint
// POST /api/create-payment-intent-for-client
// Body: { amount (in cents), currency, clientCode, description, receipt_email }
app.post('/api/create-payment-intent-for-client', async (req, res) => {
  const { amount, currency = 'usd', clientCode, description, receipt_email } = req.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    // Resolve client and its connected account
    const clientRow = await getClientRow(clientCode);
    const connected_account_id = clientRow?.connected_account_id;
    if (!connected_account_id) {
      return res.status(400).json({ error: 'Unknown client' });
    }

    // Per-client fee (percent + fixed)
    const percent = Number(clientRow.fee_percent) || 0.10;
    const fixed = Number(clientRow.fee_fixed_cents) || 0;
    const application_fee_amount = Math.round(amount * percent) + fixed; // in cents

    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      payment_method_types: ['card'],
      transfer_data: { destination: connected_account_id },
      application_fee_amount,
      metadata: {
        clientCode,
        description,
        connected_account_id
      }
    });

    // Optional: log to Supabase
    await logPaymentToSupabase(clientCode, amount, currency, pi.id, receipt_email, description);

    res.json({ clientSecret: pi.client_secret });
  } catch (e) {
    console.error('Error creating PaymentIntent-for-client:', e);
    res.status(500).json({ error: e.message });
  }
});

// Optional: webhook (skeleton)
//
// const bodyParser = express.json({ type: 'application/json' });
// app.post('/webhook', bodyParser, (req, res) => {
//   // verify signature if you set STRIPE_WEBHOOK_SECRET
//   res.json({ received: true });
// });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
