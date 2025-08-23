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
app.use(cors({
  origin: [
    'https://uniquitysolutions.com',
    'https://www.uniquitysolutions.com',
    'https://dashboard.uniquitysolutions.com'
  ],
  credentials: true
}));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Legacy: simple PaymentIntent
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

// Admin: create client (simple example)
app.post('/api/admin/create-client', async (req, res) => {
  const { client_code, name, email, tenant_id, fee_percent = 0.10, fee_fixed_cents = 0 } = req.body;
  if (!client_code || !name) return res.status(400).json({ error: 'client_code and name required' });

  const { data, error } = await supabase.from('clients').insert([
    {
      client_code,
      name,
      email,
      tenant_id,
      connected_account_id: null,
      fee_percent,
      fee_fixed_cents
    }
  ]).select();

  if (error) {
    console.error('Admin create-client error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ client: data[0] });
});

// Public signup: signup-client (create Stripe Connect account + mapping)
app.post('/api/signup-client', async (req, res) => {
  const { client_code, name, email, country = 'US' } = req.body;
  if (!client_code || !name) return res.status(400).json({ error: 'client_code and name required' });

  try {
    const acct = await stripe.accounts.create({ type: 'express', country, email });
    const { data, error } = await supabase.from('clients').insert([
      {
        client_code,
        name,
        email,
        connected_account_id: acct.id,
        fee_percent: 0.10,
        fee_fixed_cents: 0,
        tenant_id: null
      }
    ]).select();

    if (error) throw error;

    const accountLink = await stripe.accountLinks.create({
      account: acct.id,
      refresh_url: 'https://your-domain.com/reauth',
      return_url: 'https://your-domain.com/onboarding-success',
      type: 'account_onboarding',
    });

    res.json({ client: data[0], onboardingLink: accountLink.url });
  } catch (err) {
    console.error('Signup client error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Connect-aware: create-payment-intent-for-client
async function getClientRowByCode(clientCode) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, client_code, name, connected_account_id, fee_percent, fee_fixed_cents')
    .eq('client_code', clientCode)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Unknown client');
  return data;
}

async function logPaymentToSupabase(clientCode, amount, currency, paymentIntentId, receipt_email, description) {
  // Optional server-side log
  try {
    const { data, error } = await supabase.from('payments').insert([
      {
        client_code: clientCode,
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
  } catch (e) {
    console.error('Supabase log error:', e);
  }
}

app.post('/api/create-payment-intent-for-client', async (req, res) => {
  const { amount, currency = 'usd', clientCode, description, receipt_email } = req.body;
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const clientRow = await getClientRowByCode(clientCode);
    const connected_account_id = clientRow?.connected_account_id;
    if (!connected_account_id) {
      return res.status(400).json({ error: 'Unknown client' });
    }

    const percent = Number(clientRow.fee_percent) || 0.10;
    const fixed = Number(clientRow.fee_fixed_cents) || 0;
    const application_fee_amount = Math.round(amount * percent) + fixed;

    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      receipt_email,
      payment_method_types: ['card'],
      transfer_data: { destination: connected_account_id },
      application_fee_amount,
      metadata: { clientCode, description, connected_account_id }
    });

    await logPaymentToSupabase(clientCode, amount, currency, pi.id, receipt_email, description);

    res.json({ clientSecret: pi.client_secret });
  } catch (e) {
    console.error('Error creating PaymentIntent-for-client:', e);
    res.status(500).json({ error: e.message });
  }
});

// Optional: webhook skeleton
// app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => { res.json({ received: true }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
