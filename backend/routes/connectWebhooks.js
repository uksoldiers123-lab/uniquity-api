const express = require('express');
  const router = express.Router();
  const Stripe = require('stripe');
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  // POST /api/connect/webhook
  // You must verify the webhook signature in production
  router.post('/connect/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // Use your Stripe webhook secret to verify
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.log(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle relevant events
    switch (event.type) {
      case 'account.updated':
        // Update your DB with account status, charges_enabled, payouts_enabled, etc.
        // const account = event.data.object;
        // updateConnectAccountInDB(account.id, { status: account.status, charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled });
        break;
      // Add more events as needed
      default:
        break;
    }

    res.json({ received: true });
  });

  module.exports = router;
