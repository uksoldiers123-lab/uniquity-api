const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const { createClientDashboardRouter } = require('./api/routes/client-dashboard.js'); // Corrected path
const { createStripeWebhookRouter } = require('./api/routes/webhooks/stripe');

const app = express();
const port = process.env.PORT || 3000; // Set the port

// Env vars (read from .env)
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

// Middleware
app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true);
    cb(null, ALLOWED_ORIGINS.includes(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Id']
}));
app.use(express.json());

// Set Stripe instance
app.set('stripe', stripe);

// Routes
const clientDashboardRouter = createClientDashboardRouter();
app.use('/public/client-dashboard', clientDashboardRouter);

// Stripe webhooks
const webhookRouter = createStripeWebhookRouter(stripe);
app.use('/api/routes/webhooks/stripe', webhookRouter); // Corrected path

// Starting the server
console.log('Starting server...');
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
