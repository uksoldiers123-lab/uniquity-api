require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const app = express();

// Environment variables
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  DASHBOARD_JWT_SECRET,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  FRONTEND_ORIGIN = 'https://uniquitysolutions.com',
  BACKEND_API_KEY,
} = process.env;

const DASHBOARD_BASE = process.env.DASHBOARD_BASE || 'https://dashboard.uniquitysolutions.com';
const DASHBOARD_TOKEN_LIFETIME = process.env.DASHBOARD_TOKEN_LIFETIME || '10m';

// Validate environment variables
function hardFail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) hardFail('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
if (!DASHBOARD_JWT_SECRET) hardFail('Missing DASHBOARD_JWT_SECRET');
if (!STRIPE_SECRET_KEY) hardFail('Missing STRIPE_SECRET_KEY');
if (!STRIPE_WEBHOOK_SECRET) hardFail('Missing STRIPE_WEBHOOK_SECRET');

// Initialize clients
const stripe = Stripe(STRIPE_SECRET_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Middleware
app.use(cors({
  origin: [FRONTEND_ORIGIN],
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'authorization'],
}));

app.use(express.json()); // Parse JSON request bodies

// Optional API key auth
function isAuthorized(req) {
  if (!BACKEND_API_KEY) return true;
  return req.header('x-api-key') === BACKEND_API_KEY;
}

// Stripe Webhook (must be before express.json)
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.sendStatus(400);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
      case 'checkout.session.completed':
      case 'checkout.session.expired': {
        const pi = event.data.object;
        const external_id = pi.id;
        const status = event.type.includes('succeeded') ? 'succeeded' : 'failed';

        const { error: updErr } = await supabase
          .from('payments')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('external_id', external_id);

        if (updErr) console.error('Update payment status failed:', updErr);
        break;
      }
      default:
        break;
    }
    return res.json({ received: true });
  } catch (err) {
    console.error('Error handling webhook event:', err);
    return res.sendStatus(500);
  }
});

// Health check
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// Create PaymentIntent
app.post('/create-payment-intent', async (req, res) => {
  try {
    if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

    const { amount, currency = 'usd', invoice, receipt_email } = req.body || {};

    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount (integer cents)' });
    }
    if (receipt_email && !validator.isEmail(String(receipt_email))) {
      return res.status(400).json({ error: 'Invalid receipt_email' });
    }

    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: invoice ? { invoice: String(invoice) } : undefined,
      receipt_email: receipt_email || undefined,
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: pi.client_secret });
  } catch (err) {
    console.error('Error creating PaymentIntent:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create dashboard login URL
app.post('/api/create-dashboard-login', async (req, res) => {
  try {
    if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

    const { userId, email } = req.body || {};

    if (typeof userId !== 'string' || userId.length < 6) {
      return res.status(400).json({ error: 'Invalid userId' });
    }
    if (!validator.isEmail(String(email))) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, status, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    if ((user.email || '').toLowerCase() !== String(email).toLowerCase()) {
      return res.status(403).json({ error: 'Email does not match user' });
    }
    if ((user.status || '').toLowerCase() !== 'active') {
      return res.status(403).json({ error: 'User not allowed to access dashboard' });
    }

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { sub: userId, email, role: user.role || 'user', jti },
      DASHBOARD_JWT_SECRET,
      { expiresIn: DASHBOARD_TOKEN_LIFETIME, issuer: 'backend.login', audience: 'dashboard' }
    );

    const base = DASHBOARD_BASE.replace(/\/$/, '');
    const dashboardUrl = `${base}/login?token=${encodeURIComponent(token)}`;
    res.json({ dashboardUrl, expiresIn: DASHBOARD_TOKEN_LIFETIME });
  } catch (err) {
    console.error('Error in /api/create-dashboard-login:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record a payment by account_code
app.post('/payments/record', async (req, res) => {
  try {
    if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

    const { account_code, amount_cents, currency = 'usd', method = 'card', customer_ref, metadata } = req.body || {};

    if (!account_code || typeof account_code !== 'string') {
      return res.status(400).json({ error: 'account_code required' });
    }
    if (!Number.isInteger(amount_cents) || amount_cents <= 0) {
      return res.status(400).json({ error: 'amount_cents must be positive integer' });
    }

    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .select('id, user_id, account_code')
      .eq('account_code', account_code)
      .maybeSingle();

    if (accErr) {
      console.error('Supabase accounts error:', accErr);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!account) return res.status(404).json({ error: 'Invalid account_code' });

    let external_id = null;
    let clientSecret = null;

    if (method === 'card') {
      const pi = await stripe.paymentIntents.create({
        amount: amount_cents,
        currency,
        metadata: {
          account_code,
          user_id: account.user_id,
        },
        automatic_payment_methods: { enabled: true },
      });
      external_id = pi.id;
      clientSecret = pi.client_secret;
    }

    const status = method === 'card' ? 'pending' : 'succeeded';
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert([{
        user_id: account.user_id,
        account_id: account.id,
        account_code: account.account_code,
        amount_cents,
        currency,
        method,
        status,
        external_id,
        customer_ref: customer_ref || null,
        metadata: metadata || {},
      }])
      .select('id, status, external_id')
      .maybeSingle();

    if (payErr) {
      console.error('Supabase payments insert error:', payErr);
      return res.status(500).json({ error: 'Failed to record payment' });
    }

    return res.status(201).json({
      payment_id: payment.id,
      status: payment.status,
      clientSecret, // only for card
    });
  } catch (e) {
    console.error('Error in /payments/record:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
