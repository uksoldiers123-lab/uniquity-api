
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const app = express();

/*
Set these in Render (Environment)
- SUPABASE_URL=https://YOUR-PROJECT.supabase.co
- SUPABASE_SERVICE_ROLE_KEY=... (rotate and paste new value)
- DASHBOARD_JWT_SECRET=... (long random; rotate if leaked)
- DASHBOARD_BASE=https://dashboard.uniquitysolutions.com
- DASHBOARD_TOKEN_LIFETIME=10m
- STRIPE_SECRET_KEY=sk_...
- STRIPE_WEBHOOK_SECRET=whsec_...
- FRONTEND_ORIGIN=https://uniquitysolutions.com
- BACKEND_API_KEY=... (random; used in x-api-key)
*/

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

// Validate env
function hardFail(msg) { console.error(msg); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) hardFail('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
if (!DASHBOARD_JWT_SECRET) hardFail('Missing DASHBOARD_JWT_SECRET');
if (!/^https?:\/\//i.test(DASHBOARD_BASE)) hardFail('DASHBOARD_BASE must be a full URL');
if (!STRIPE_SECRET_KEY) hardFail('Missing STRIPE_SECRET_KEY');
if (!STRIPE_WEBHOOK_SECRET) hardFail('Missing STRIPE_WEBHOOK_SECRET');

// Initialize clients
const stripe = Stripe(STRIPE_SECRET_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS
app.use(cors({
  origin: [FRONTEND_ORIGIN],
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'authorization'],
}));

// Optional API key auth
function isAuthorized(req) {
  if (!BACKEND_API_KEY) return true;
  return req.header('x-api-key') === BACKEND_API_KEY;
}

// 1) Stripe Webhook (must be before express.json)
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
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const external_id = pi.id;
        const { error: updErr } = await supabase
          .from('payments')
          .update({ status: 'succeeded', updated_at: new Date().toISOString() })
          .eq('external_id', external_id);
        if (updErr) console.error('Update payment to succeeded failed:', updErr);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        const external_id = pi.id;
        const { error: updErr } = await supabase
          .from('payments')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('external_id', external_id);
        if (updErr) console.error('Update payment to failed failed:', updErr);
        break;
      }
      case 'checkout.session.completed': {
        const s = event.data.object;
        const external_id = s.id;
        const { error: updErr } = await supabase
          .from('payments')
          .update({ status: 'succeeded', updated_at: new Date().toISOString() })
          .eq('external_id', external_id);
        if (updErr) console.error('Update payment (checkout) failed:', updErr);
        break;
      }
      case 'checkout.session.expired': {
        const s = event.data.object;
        const external_id = s.id;
        const { error: updErr } = await supabase
          .from('payments')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('external_id', external_id);
        if (updErr) console.error('Expire payment (checkout) failed:', updErr);
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

// 2) JSON body parser
app.use(express.json());

// Health
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// 3) Create PaymentIntent
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

// 4) Create dashboard login URL (includes role)
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

// 5) Record a payment by account_code (ties to user/account, optional Stripe card flow)
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

// 6) API keys management (optional; keep if needed)
function generateApiKey({ prefix = 'upk_live', length = 24 } = {}) {
  const raw = crypto.randomBytes(length).toString('base64url');
  const key = `${prefix}_${raw}`;
  const key_prefix = key.split('_').slice(0, 2).join('_');
  return { key, key_prefix };
}

app.post('/api/api-keys', async (req, res) => {
  try {
    if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

    const { company_id, prefix = 'upk_live' } = req.body || {};
    if (!company_id || typeof company_id !== 'string') {
      return res.status(400).json({ error: 'company_id required' });
    }

    const { key, key_prefix } = generateApiKey({ prefix });
    const key_hash = await bcrypt.hash(key, 12);

    const { data, error } = await supabase
      .from('api_keys')
      .insert([{ company_id, key_prefix, key_hash, status: 'active' }])
      .select('id, company_id, key_prefix, status, created_at')
      .maybeSingle();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to create API key' });
    }

    res.status(201).json({ key, metadata: data });
  } catch (err) {
    console.error('Error creating API key:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/api-keys', async (req, res) => {
  try {
    if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

    const company_id = String(req.query.company_id || '');
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = Math.min(parseInt(req.query.page_size || '20', 10), 100);

    if (!company_id) return res.status(400).json({ error: 'company_id is required' });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('api_keys')
      .select('id, company_id, key_prefix, status, created_at, last_used_at', { count: 'exact' })
      .eq('company_id', company_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Supabase select error:', error);
      return res.status(500).json({ error: 'Failed to fetch API keys' });
    }

    res.json({
      items: data || [],
      page,
      pageSize,
      total: count || 0,
    });
  } catch (err) {
    console.error('Error listing API keys:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/api-keys/:id', async (req, res) => {
  try {
    if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

    const id = req.params.id;
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, company_id, key_prefix, status, created_at, last_used_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Supabase select error:', error);
      return res.status(500).json({ error: 'Failed to fetch API key' });
    }
    if (!data) return res.status(404).json({ error: 'Not found' });

    res.json(data);
  } catch (err) {
    console.error('Error getting API key:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/api-keys/:id/status', async (req, res) => {
  try {
    if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

    const id = req.params.id;
    const { status } = req.body || {};
    const allowed = ['active', 'suspended', 'revoked'];
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data, error } = await supabase
      .from('api_keys')
      .update({ status })
      .eq('id', id)
      .select('id, company_id, key_prefix, status, created_at, last_used_at')
      .maybeSingle();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to update status' });
    }
    if (!data) return res.status(404).json({ error: 'Not found' });

    res.json(data);
  } catch (err) {
    console.error('Error updating API key status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});
