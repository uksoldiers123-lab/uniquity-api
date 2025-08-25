const express = require('express');
const router = express.Router();
const STRIPE_WEBHOOK_SIGNING_SECRET = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;

// Use raw body for Stripe signature verification
const bodyParser = require('body-parser');
router.post('/', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  if (!STRIPE_WEBHOOK_SIGNING_SECRET) {
    console.error('STRIPE_WEBHOOK_SIGNING_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  const stripe = req.app.get('stripe');
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // req.body is a Buffer due to raw body middleware
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SIGNING_SECRET);
  } catch (err) {
    console.error('Webhook verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'setup_intent.created':
      {
        const si = event.data.object;
        console.log('SetupIntent created', si.id);
        // Persist if you track setup intents
        break;
      }
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      console.log('PaymentIntent succeeded', pi.id);
      // Persist to DB (e.g., payments table) if metadata.clientId exists
      break;
    }
    case 'billing.meter.error_report_triggered':
    case 'v2.core.event': {
      const e = event.data.object;
      console.log('Billing/v2 event', event.type, e?.id);
      break;
    }
    default:
      console.log('Unhandled event type', event.type);
  }

  res.json({ received: true });
});

module.exports = { createStripeWebhookRouter: () => router };
