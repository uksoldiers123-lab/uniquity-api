require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

// Initialize Stripe with your secret key from env
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Create Express app
const app = express();

// Middleware
app.use(express.json());

// CORS: Allow your frontend domain(s)
// Replace with your actual frontend URL if different
const FRONTEND_ORIGINS = [
  'https://uniquitysolutions.com',
  'https://www.uniquitysolutions.com'
];

// If you have multiple environments, you can conditionally push origins
app.use(cors({
  origin: FRONTEND_ORIGINS,
  credentials: true
}));

// Quick health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// NEW: Create PaymentIntent endpoint
// POST /create-payment-intent
// Body: { amount: <in cents>, currency: "usd", description: "...", receipt_email: "..." }
app.post('/create-payment-intent', async (req, res) => {
  const { amount, currency = 'usd', description, receipt_email } = req.body;

  // Basic validation
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      receipt_email,
      payment_method_types: ['card']
    });

    res.json({ clientSecret: pi.client_secret });
  } catch (err) {
    console.error('Error creating PaymentIntent:', err);
    res.status(500).json({ error: err.message });
  }
});

// Optional: default route (helpful for quick sanity checks)
app.get('/', (req, res) => {
  res.json({ message: 'Uniquity API (Stripe Payments) is running' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
