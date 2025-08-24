const express = require('express');
const router = express.Router();

/**
 * Factory: createClientDashboardRouter
 * Inject dependencies if needed (stripe instance, db helpers, etc.)
 * For now, it uses req.app.get('stripe') if Stripe is mounted on the app.
 */
function createClientDashboardRouter() {
  // Supabase JWT verification should replace this in production
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

    // TODO: replace placeholders with real DB queries
    res.json({
      clientId,
      connectedAccountId: null, // fetch from DB
      onboardingUrl: null,        // on onboarding flow
      totalPaidCents: 0,
      currency: 'usd',
      lastPaymentAt: null
    });
  });

  // GET /client-dashboard/:clientId/payments
  router.get('/client/:clientId/payments', requireClientOwner, async (req, res) => {
    const { clientId } = req.params;

    // TODO: fetch from DB
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
      const intent = await stripe.paymentIntents.create({
        amount: Number(amount),
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: { clientId }
        // For destination transfers, include transfer_data here after you store connect_account_id
      });
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
      // Create a Stripe Connect account (adjust type as needed)
      const account = await stripe.accounts.create({ type: 'standard' });
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: 'https://your-backend/refresh', // replace with real
        return_url: 'https://dashboard.uniquitysolutions.com/onboarding/return', // replace with real
        type: 'account_onboarding',
      });
      // Persist account.id to DB for clientId (implementation dependent)
      res.json({ clientId, connectAccountId: account.id, onboardingUrl: accountLink.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { createClientDashboardRouter };
