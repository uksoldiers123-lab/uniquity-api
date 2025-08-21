const express = require('express');
const app = express();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());

app.post('/create-payment-intent', async (req, res) => {
  const { amount, currency = 'usd', description, receipt_email } = req.body;

  // Basic server-side validation
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      receipt_email,
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: pi.client_secret });
  } catch (err) {
    console.error('Error creating PaymentIntent:', err);
    res.status(500).json({ error: err.message });
  }
});

// If you already have other routes, keep them; otherwise start the server:
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
