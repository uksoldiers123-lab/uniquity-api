const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
require('dotenv').config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.use(cors({ origin: '*' })); // testing only; tighten for production
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Create a PaymentIntent for a dynamic amount
app.post('/create-payment-intent', async (req, res) => {
  const { amount, currency = 'usd' } = req.body;
  if (amount == null || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  try {
    const amountInCents = Math.round(amount * 100);
    const pi = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      payment_method_types: ['card'],
    });
    res.json({ clientSecret: pi.client_secret });
  } catch (err) {
    console.error('Error creating PaymentIntent', err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook endpoint
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    console.log('Payment succeeded:', pi.id);
    // Update your DB / Supabase here using pi.id, pi.amount, etc.
  } else if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object;
    console.log('Payment failed:', pi.id);
  }

  res.json({ received: true });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Start
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
