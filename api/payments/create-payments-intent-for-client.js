const express = require('express');
const router = express.Router();

// You must install and require stripe: npm install stripe
const Stripe = require('stripe');
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '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';
const stripe = Stripe(STRIPE_SECRET_KEY);

// Placeholder: a simple in-memory mapping of clientCode to connected_account_id
// In production, replace with DB lookup (Supabase) to map clientCode -> connected_account_id
const clientStore = {
  'CLI-001': { connected_account_id: 'acct_1ExampleA', application_fee_amount: 500 }, // $5.00 platform fee
  // Add more client mappings as needed
};

router.post('/payments/create-payment-intent-for-client', async (req, res) => {
  try {
    const { clientCode, amount, currency = 'usd', billing_details = {} } = req.body || {};

    if (!clientCode || !amount) {
      return res.status(400).json({ error: 'clientCode and amount are required' });
    }

    const client = clientStore[clientCode];
    if (!client) {
      return res.status(404).json({ error: 'Unknown clientCode' });
    }

    // Create a PaymentIntent on the platform account with Stripe Connect
    const paymentIntentParams = {
      amount: Number(amount),
      currency: String(currency).toLowerCase(),
      // Attach metadata for traceability
      metadata: {
        clientCode,
      },
      // If you want to collect billing details on the PaymentIntent, you can set them here
    };

    // If using Connect, specify the on_behalf_of and transfer_data fields
    if (client.connected_account_id) {
      paymentIntentParams.transfer_data = {
        destination: client.connected_account_id,
      };
      // Optional: platform fee
      if (client.application_fee_amount) {
        paymentIntentParams.application_fee_amount = Number(client.application_fee_amount);
      }
    }

    // Create the PaymentIntent; using Stripe Connect destination for per-client accounts
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, {
      // If you want to specify a specific Stripe-connected account to act as the platform
      // You can set stripeAccount param in the top-level or per-call; here we rely on destination
    });

    res.json({ paymentIntent: { id: paymentIntent.id, clientSecret: paymentIntent.client_secret, status: paymentIntent.status } });
  } catch (err) {
    console.error('Error creating payment intent', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
