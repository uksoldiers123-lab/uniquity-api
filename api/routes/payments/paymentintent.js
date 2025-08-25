const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-payment-intent', async (req, res) => {
  const { amount, currency = 'usd', description, receipt_email, payment_method_types = ['card'] } = req.body || {};

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      receipt_email,
      payment_method_types,
    });
    res.json({ clientSecret: pi.client_secret, id: pi.id });
  } catch (err) {
    console.error('Error creating PaymentIntent:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
