const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const { createClientDashboardRouter } = require('./routes/client-dashboard');
const { createStripeWebhookRouter } = require('./routes/webhooks/stripe');

// Optional: Supabase auth middleware (replace with real)
 // const { supabaseAuthMiddleware } = require('../middleware/supabase-auth');

const app = express();

// Env vars (replace with real values)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ziltrcaehpshkwganlcy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'public-anon-key';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY');
  process.exit(1);
}
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://uniquitysolutions.com';
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  `${APP_BASE_URL},https://dashboard.uniquitysolutions.com`
).split(',').map(s => s.trim()).filter(Boolean);

// Middlewares
app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true);
    cb(null, ALLOWED_ORIGINS.includes(origin));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Id']
}));
app.use(express.json());

// Simple health check
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Attach Stripe instance to app for routes to reuse
app.set('stripe', stripe);

// Routes
const clientDashboardRouter = createClientDashboardRouter();
app.use('/client-dashboard', clientDashboardRouter);

// Stripe webhooks
const webhookRouter = createStripeWebhookRouter(stripe);
app.use('/webhooks/stripe', webhookRouter);

module.exports = app;
