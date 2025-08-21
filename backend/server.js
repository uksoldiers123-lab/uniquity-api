const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

// Initialize Express and Stripe
const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Configure CORS to allow requests from the frontend domain
app.use(cors({
  origin: 'https://uniquitysolutions.com', // Allow requests from your frontend
  methods: ['POST'], // Allow only POST requests
}));

// Parse JSON request bodies
app.use(express.json());

// Create a Payment Intent
app.post('/api/create-payment-intent', async (req, res) => {
  const { amount, currency } = req.body;

  try {
    // Create a Payment Intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Amount in cents (e.g., $10.00 = 1000)
      currency, // Currency (e.g., 'usd')
    });

    // Send the client secret to the frontend
    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating Payment Intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
