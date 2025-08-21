const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

// Env vars required:
//   STRIPE_SECRET_KEY = sk_live_... (or sk_test_...)
// Optional:
//   SUCCESS_URL = https://uniquitysolutions.com/success
//   CANCEL_URL  = https://uniquitysolutions.com/cancel
//   ALLOWED_ORIGINS = comma-separated origins; defaults to your domains

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY');
  process.exit(1);
}
const stripe = Stripe(STRIPE_SECRET_KEY);

const SUCCESS_URL = process.env.SUCCESS_URL || 'https://uniquitysolutions.com/success';
const CANCEL_URL = process.env.CANCEL_URL || 'https://uniquitysolutions.com/cancel';

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
    if (!origin) return cb(null, true); // allow curl/postman
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
  if (cents < 50 || cents > 10000000) return null; // 50¢ to $100k
  return cents;
}

// 1) Elements flow: create Payment Intent
// Body: { amount: 49.99 | 4999, currency?: 'usd', metadata?: {...} }
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

// 2) Checkout flow (AJAX): create session and return URL
// Body: { amount: 49.99 | 4999, description?: 'text' }
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const cents = toCents(req.body?.amount);
    if (!cents) return res.status(400).json({ error: 'invalid_amount' });

    const description = (req.body?.description || 'Uniquity Payment').toString().slice(0, 100);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: cents,
            product_data: { name: description }
          },
          quantity: 1
        }
      ],
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      metadata: { source: 'uniquity-api' }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'checkout_session_error' });
  }
});

// 3) Checkout flow (simple link): redirect to Stripe
// GET /pay?amount=49.99&description=Invoice
app.get('/pay', async (req, res) => {
  try {
    const cents = toCents(req.query.amount ?? '49.99'); // default $49.99
    if (!cents) return res.status(400).send('Invalid amount');

    const description = (req.query.description || 'Uniquity Payment').toString().slice(0, 100);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: cents,
            product_data: { name: description }
          },
          quantity: 1
        }
      ],
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL
    });

    res.redirect(303, session.url);
  } catch (error) {
    console.error('Redirect pay error:', error);
    res.status(500).send('Payment init failed');
  }
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'server_error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Uniquity API running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
