// backend/server.js
const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

// Initialize Express and Stripe
const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // Use environment variable for the Stripe Secret Key

// Middleware
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Parse JSON request bodies

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
