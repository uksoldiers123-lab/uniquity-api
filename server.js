
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // set in env

app.use(bodyParser.json());
app.use(express.static("public")); // serves the front-end if you put it in public

// Create a PaymentIntent
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency = "usd", invoice, receipt_email } = req.body;

    // You can attach metadata as needed
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { invoice },
      receipt_email
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Error creating PaymentIntent:", err);
    res.status(500).json({ error: err.message });
  }
});

// Webhooks (optional but recommended)
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log("Webhook signature verification failed.");
    return res.sendStatus(400);
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      // fulfill order
      break;
    // handle other events as needed
    default:
  }

  res.json({ received: true });
});

const port = process.env.PORT || 4242;
app.listen(port, () => console.log(`Server running on port ${port}`));
