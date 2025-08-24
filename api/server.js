/*
  This file exports a configured Express app (no listen)
  You can extend with your existing routes (api, admin, etc.)
*/
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

// Env vars
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY');
  process.exit(1);
}
const stripe = Stripe(STRIPE_SECRET_KEY);

const SUCCESS_URL = process.env.SUCCESS_URL || 'https://uniquitysolutions.com/success';
const CANCEL_URL  = process.env.CANCEL_URL  || 'https://uniquitysolutions.com/cancel';

const app = express();

// CORS
const defaultOrigins = [
  'https://uniquitysolutions.com',
  'https://www.uniquitysolutions.com',
  'http://localhost:3000',
  'http://localhost:5173'
];
const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const allowedOrigins = envOrigins.length ? envOrigins : defaultOrigins;

app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true);
    cb(null, allowedOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Helpers
function toCents(amount) {
  if (amount === undefined || amount === null || amount === '') return null;
  let cents = null;
  if (typeof amount === 'number' && Number.isFinite(amount)) {
    cents = Math.round(amount * 100);
  } else {
    const s = String(amount).trim();
    if (/^\d+(\.\d{1,2})?$/.test(s)) cents = Math.round(parseFloat(s) * 100);
    else if (/^\d+$/.test(s)) cents = parseInt(s, 10);
  }
  if (!Number.isFinite(cents)) return null;
  if (cents < 50 || cents > 10000000) return null;
  return cents;
}

// Endpoint: create-payment-intent (example)
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const cents = toCents(req.body?.amount);
    const currency = (req.body?.currency || 'usd').toLowerCase();
    if (!cents) return res.status(400).json({ error: 'invalid_amount' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: cents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: { source: 'uniquity-api', ...(req.body?.metadata || {}) }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('PI create error:', error);
    res.status(500).json({ error: 'payment_intent_error' });
  }
});

// You can add more routes here (checkout, webhooks, etc.)

module.exports = app;
