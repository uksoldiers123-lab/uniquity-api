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
Environment variables to set on Render (Backend only):
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- DASHBOARD_JWT_SECRET
- DASHBOARD_BASE (e.g., https://dashboard.uniquitysolutions.com)
- DASHBOARD_TOKEN_LIFETIME (e.g., 10m) [optional]
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- FRONTEND_ORIGIN (e.g., https://uniquitysolutions.com)
- BACKEND_API_KEY (a strong string you send as x-api-key) [recommended]
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
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!DASHBOARD_JWT_SECRET) {
  console.error('Missing DASHBOARD_JWT_SECRET.');
  process.exit(1);
}
if (!/^https?:\/\//i.test(DASHBOARD_BASE)) {
  console.error('DASHBOARD_BASE must be a full URL, e.g., https://dashboard.example.com');
  process.exit(1);
}
if (!STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY.');
  process.exit(1);
}
if (!STRIPE_WEBHOOK_SECRET) {
  console.error('Missing STRIPE_WEBHOOK_SECRET.');
  process.exit(1);
}

// Initialize clients
const stripe = Stripe(STRIPE_SECRET_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS: allow only your frontend
app.use(cors({
  origin: [FRONTEND_ORIGIN],
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'authorization'],
}));

// Optional API key auth helper (recommended)
function isAuthorized(req) {
  if (!BACKEND_API_KEY) return true; // set BACKEND_API_KEY in env to enforce
  const provided = req.header('x-api-key');
  return !!provided && provided === BACKEND_API_KEY;
}

// 1) Stripe Webhook (must be before express.json())
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
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
        // TODO: fulfill order (update your DB, mark invoice paid, etc.)
        break;
      case 'payment_intent.payment_failed':
        // TODO: handle failure (notify, retry logic, etc.)
        break;
      default:
        break;
    }
    return res.json({ received: true });
  } catch (err) {
    console.error('Error handling webhook event:', err);
    return res.sendStatus(500);
  }
});

// 2) JSON body parser for all other routes
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// 3) Create a PaymentIntent
app.post('/create-payment-intent', async (req, res) => {
  try {
    if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

    const { amount, currency = 'usd', invoice, receipt_email } = req.body || {};
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount (integer, smallest currency unit).' });
    }
    if (receipt_email && !validator.isEmail(String(receipt_email))) {
      return res.status(400).json({ error: 'Invalid receipt_email.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: invoice ? { invoice: String(invoice) } : undefined,
      receipt_email: receipt_email || undefined,
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Error creating PaymentIntent:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4) Dashboard login (short-lived JWT)
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

    // Verify user from your users table
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, status')
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
      { sub: userId, email, jti },
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

// 5) API keys management (server-side, secure)

// Helper: generate API key
function generateApiKey({ prefix = 'upk_live', length = 24 } = {}) {
  const raw = crypto.randomBytes(length).toString('base64url'); // URL-safe
  const key = `${prefix}_${raw}`;
  const key_prefix = key.slice(0, prefix.length + 5); // e.g., upk_xxxx (adjust as you like)
  return { key, key_prefix };
}

// Create a new API key for a company
app.post('/api/api-keys', async (req, res) => {
  try {
    if (!isAuthorized(req)) return res.status(403).json({ error: 'Unauthorized' });

    const { company_id, prefix = 'upk_live' } = req.body || {};
    if (!company_id || typeof company_id !== 'string') {
      return res.status(400).json({ error: 'company_id required' });
    }

    const { key, key_prefix } = generateApiKey({ prefix });
    const saltRounds = 12;
    const key_hash = await bcrypt.hash(key, saltRounds);

    const { data, error } = await supabase
      .from('api_keys')
      .insert([{ company_id, key_prefix, key_hash, status: 'active' }])
      .select('id, company_id, key_prefix, status, created_at')
      .maybeSingle();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to create API key' });
    }

    // Return the cleartext key ONCE
    res.status(201).json({
      key, // show once
      metadata: data,
    });
  } catch (err) {
    console.error('Error creating API key:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List API keys (by company) with pagination
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

// Get a single key metadata (never return key_hash)
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

// Update key status (active/suspended/revoked)
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});

Dependencies to include in package.json
- "@supabase/supabase-js"
- "bcryptjs"
- "cors"
- "express"
- "jsonwebtoken"
- "stripe"
- "validator"
