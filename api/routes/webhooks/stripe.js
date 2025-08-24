const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// You must configure a Stripe webhook signing secret in your Stripe dashboard and export it
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;

router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SIGNING_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const stripe = req.app.get('stripe');
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  switch (event.type) {
    case 'payment_intent.succeeded':
      {
        const pi = event.data.object;
        // Persist payment here and mark as succeeded
        // Example: insert into payments with client_id from metadata.clientId if you stored it
        console.log('PaymentIntent succeeded', pi.id);
        break;
      }
    case 'charge.succeeded':
      {
        const charge = event.data.object;
        console.log('Charge succeeded', charge.id);
        break;
      }
    // Add more events as needed (transfer.paid, payout.paid, etc.)
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = { createStripeWebhookRouter: () => router };
