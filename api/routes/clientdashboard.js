
const express = require('express');
const router = express.Router();

// Basic per-client auth guard using Supabase JWT if present
// In production, replace with proper JWT verification against SUPABASE_URL/SUPABASE_ANON_KEY
function requireClientOwner(req, res, next) {
  const clientId = req.params.clientId;
  const headerClientId = req.headers['x-client-id'];
  if (!clientId) return res.status(400).json({ error: 'clientId required' });
  if (headerClientId && headerClientId !== clientId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}

// Helper to get Stripe instance
function getStripe(req) {
  return req.app.get('stripe');
}

// GET /client-dashboard/:clientId/dashboard
router.get('/client/:clientId/dashboard', requireClientOwner, async (req, res) => {
  const { clientId } = req.params;
  // In a full implementation, fetch from DB:
  // - connect_account_id
  // - totalPaid, currency
  // - lastPaymentAt
  // For this patch, return placeholders unless you wire the DB
  res.json({
    clientId,
    connectedAccountId: null, // fill from DB
    onboardingUrl: null,        // if onboarding in progress
    totalPaidCents: 0,
    currency: 'usd',
    lastPaymentAt: null
  });
});

// GET /client-dashboard/:clientId/payments
router.get('/client/:clientId/payments', requireClientOwner, async (req, res) => {
  const { clientId } = req.params;
  // Replace with DB fetch of payments for this client
  const payments = [];
  res.json({ clientId, payments });
});

// POST /client-dashboard/:clientId/payments/create-payment-intent
router.post('/client/:clientId/payments/create-payment-intent', requireClientOwner, async (req, res) => {
  const { clientId } = req.params;
  const { amount, currency = 'usd' } = req.body || {};
  if (!amount) return res.status(400).json({ error: 'amount is required' });

  const stripe = getStripe(req);
  try {
    // platform fee (your portion) in cents
    const applicationFeeAmount = Math.round((amount) * (Number(process.env.STRIPE_PLATFORM_FEE_PERCENT) || 0.10));

    const intent = await stripe.paymentIntents.create({
      amount: Number(amount),
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: { clientId },
      transfer_data: {
        // The destination account will be set when connectAccountId is known for the client
        // Transfer to a connected account is used via a separate createTransfer or paymentIntent with destination
        // For simplicity: let user complete payment and later associate transfer via payout logic
      },
      transfer_group: `client-${clientId}-payments`
    });

    // Optional: record the intent in DB with clientId
    res.json({ clientId, paymentIntent: intent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /client-dashboard/:clientId/connect
// Begin Stripe Connect onboarding for this client
router.post('/client/:clientId/connect', requireClientOwner, async (req, res) => {
  const { clientId } = req.params;
  const stripe = getStripe(req);

  try {
    // Look up or create a Stripe Connect account for this client
    // For demo: create a new standard account (adjust to your needs)
    const account = await stripe.accounts.create({ type: 'standard' });

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://your-backend/refresh', // replace with real
      return_url: 'https://dashboard.uniquitysolutions.com/onboarding/return', // replace with real
      type: 'account_onboarding',
    });

    // Persist connect account id to DB for this client (pseudo-insert)
    // TODO: insert into connect_accounts table with clientId and account.id

    res.json({ clientId, connectAccountId: account.id, onboardingUrl: accountLink.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { createClientDashboardRouter: () => router };
module.exports = router;
