const express = require('express');
const { Client } = require('pg');
const router = express.Router();

function createClientDashboardRouter() {
  function requireClientOwner(req, res, next) {
    const clientId = req.params.clientId;
    const headerClientId = req.headers['x-client-id'];
    if (!clientId) return res.status(400).json({ error: 'clientId required' });
    if (headerClientId && headerClientId !== clientId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  }

  function getDbClient() {
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) throw new Error('SUPABASE_DB_URL not configured');
    return new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  }

  function getStripe(req) {
    return req.app.get('stripe');
  }

  // GET /client-dashboard/:clientId/dashboard
  router.get('/client/:clientId/dashboard', requireClientOwner, async (req, res) => {
    const { clientId } = req.params;
    const db = getDbClient();
    try {
      await db.connect();

      // Read connected account id for this client
      const caRes = await db.query(
        'SELECT stripe_account_id, status FROM connect_accounts WHERE client_id = $1 ORDER BY id DESC LIMIT 1',
        [clientId]
      );
      const connectedAccountId = caRes.rows[0]?.stripe_account_id || null;

      // Read total paid amount for this client
      const payRes = await db.query(
        'SELECT COALESCE(SUM(amount),0) AS total_paid FROM payments WHERE client_id = $1',
        [clientId]
      );
      const totalPaidCents = Number(payRes.rows[0]?.total_paid || 0);

      // Last payment date
      const lastPayRes = await db.query(
        'SELECT created_at FROM payments WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1',
        [clientId]
      );
      const lastPaymentAt = lastPayRes.rows[0]?.created_at || null;

      res.json({
        clientId,
        connectedAccountId,
        onboardingUrl: null,
        totalPaidCents,
        currency: 'usd',
        lastPaymentAt
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await db.end();
    }
  });

  // GET /client-dashboard/:clientId/payments
  router.get('/client/:clientId/payments', requireClientOwner, async (req, res) => {
    const { clientId } = req.params;
    const db = getDbClient();
    try {
      await db.connect();
      const payments = await db.query(
        'SELECT id, stripe_payment_intent_id, amount, currency, status, created_at FROM payments WHERE client_id = $1 ORDER BY created_at DESC',
        [clientId]
      );
      res.json({ clientId, payments: payments.rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await db.end();
    }
  });

  // POST /client-dashboard/:clientId/payments/create-payment-intent
  router.post('/client/:clientId/payments/create-payment-intent', requireClientOwner, async (req, res) => {
    const { clientId } = req.params;
    const { amount, currency = 'usd' } = req.body || {};
    if (!amount) return res.status(400).json({ error: 'amount is required' });

    const stripe = getStripe(req);
    const db = getDbClient();

    try {
      let destination = null;
      let appFeeCents = 0;

      const ca = await db.query(
        'SELECT stripe_account_id FROM connect_accounts WHERE client_id = $1 ORDER BY id DESC LIMIT 1',
        [clientId]
      );
      if (ca.rows[0]?.stripe_account_id) {
        destination = ca.rows[0].stripe_account_id;
        const platformFeePercent = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT) || 0.10;
        appFeeCents = Math.round(Number(amount) * platformFeePercent);
      }

      const config = {
        amount: Number(amount),
        currency,
        metadata: { clientId },
        automatic_payment_methods: { enabled: true }
      };
      if (destination) {
        config.transfer_data = { destination };
        if (appFeeCents > 0) config.application_fee_amount = appFeeCents;
      }

      const intent = await stripe.paymentIntents.create(config);

      await db.query(
        'INSERT INTO payments (client_id, stripe_payment_intent_id, amount, currency, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [clientId, intent.id, amount, currency, intent.status]
      );

      res.json({ clientId, paymentIntent: intent });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await db.end();
    }
  });

  // Onboarding
  router.post('/client/:clientId/connect', requireClientOwner, async (req, res) => {
    const { clientId } = req.params;
    const stripe = getStripe(req);
    const db = getDbClient();

    try {
      const account = await stripe.accounts.create({ type: 'standard' });
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: process.env.REFRESH_URL || 'https://dashboard.uniquitysolutions.com/refresh',
        return_url: process.env.RETURN_URL || 'https://dashboard.uniquitysolutions.com/dashboard',
        type: 'account_onboarding',
      });

      await db.query(
        'INSERT INTO connect_accounts (client_id, stripe_account_id, status, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (client_id) DO UPDATE SET stripe_account_id = EXCLUDED.stripe_account_id',
        [clientId, account.id, 'onboarding']
      );

      res.json({ clientId, connectAccountId: account.id, onboardingUrl: accountLink.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await db.end();
    }
  });

  return router;
}

module.exports = { createClientDashboardRouter };
