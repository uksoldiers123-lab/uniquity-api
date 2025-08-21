const express = require('express');
     const Stripe = require('stripe');
     const cors = require('cors');

     const app = express();
     const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

     app.use(cors());
     app.use(express.json());

     app.post('/api/create-payment-intent', async (req, res) => {
       const { amount, currency } = req.body;

       try {
         const paymentIntent = await stripe.paymentIntents.create({
           amount, // Amount in cents (e.g., $10.00 = 1000)
           currency, // Currency (e.g., 'usd')
         });

         res.status(200).json({ clientSecret: paymentIntent.client_secret });
       } catch (error) {
         console.error('Error creating Payment Intent:', error);
         res.status(500).json({ error: error.message });
       }
     });

     const PORT = process.env.PORT || 3000;
     app.listen(PORT, () => {
       console.log(`Server running on http://localhost:${PORT}`);
     });
