const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');

const app = express();
app.use(express.json());

// Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const DASHBOARD_JWT_SECRET = process.env.DASHBOARD_JWT_SECRET;
const DASHBOARD_BASE = process.env.DASHBOARD_BASE || 'https://dashboard.uniquitysolutions.com';
if (!DASHBOARD_JWT_SECRET) {
  console.error('Missing DASHBOARD_JWT_SECRET.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Create a PaymentIntent (Stripe)
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', invoice, receipt_email } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { invoice },
      receipt_email,
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Error creating PaymentIntent:', err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook (Stripe)
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log('Webhook signature verification failed.');
    return res.sendStatus(400);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      // TODO: fulfill order
      break;
    // handle other events as needed
    default:
  }

  res.json({ received: true });
});

// Supabase dashboard login (existing logic)
app.post('/api/create-dashboard-login', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing userId or email' });
    }

    // Verify user exists on the backend (server-side)
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Create a short-lived token with user identity
    const token = jwt.sign({ userId, email }, DASHBOARD_JWT_SECRET, { expiresIn: '10m' });

    // Build the dashboard login URL
    const dashboardUrl = `${DASHBOARD_BASE}/login-redirect.html?token=${token}`;
    res.json({ dashboardUrl });
  } catch (err) {
    console.error('Error in /api/create-dashboard-login:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API server listening on port ${port}`));
