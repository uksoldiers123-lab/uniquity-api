const express = require('express');
const router = express.Router();
const bodyParser = express.json;

// You must configure a Stripe webhook signing secret in your Stripe dashboard and export it
const STRIPE_WEBHOOK_SIGNING_SECRET = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;

// Webhook endpoint uses raw body to verify signature; adapt if needed
router.post('/', bodyParser({ type: 'application/json' }), (req, res) => {
  if (!STRIPE_WEBHOOK_SIGNING_SECRET) {
    console.error('STRIPE_WEBHOOK_SIGNING_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }
  // Note: For proper verification, you should use the raw request body.
  // This placeholder assumes body is already parsed; adjust as needed.
  const stripe = req.app.get('stripe');
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    // If you use the raw body, replace with: stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SIGNING_SECRET)
    event = stripe.webhooks.constructEvent(JSON.stringify(req.body || {}), sig, STRIPE_WEBHOOK_SIGNING_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Simple event handling
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      console.log('PaymentIntent succeeded', pi.id);
      // Persist to DB: payments table with client_id from metadata if you stored it
      break;
    }
    case 'charge.succeeded': {
      const charge = event.data.object;
      console.log('Charge succeeded', charge.id);
      break;
    }
    // Add more events as needed
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  res.json({ received: true });
});

module.exports = { createStripeWebhookRouter: () => router };
