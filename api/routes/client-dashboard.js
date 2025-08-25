const express = require('express');
const { Client } = require('pg');
const router = express.Router();

function createClientDashboardRouter() {
  // TODO: Replace with real Supabase JWT middleware later
  function requireClientOwner(req, res, next) {
    const clientId = req.params.clientId;
    const headerClientId = req.headers['x-client-id'];
    if (!clientId) return res.status(400).json({ error: 'clientId required' });
    if (headerClientId && headerClientId !== clientId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  }

  // Env-driven DB client
  function getDbClient() {
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) throw new Error('SUPABASE_DB_URL not configured');
    // Use pg client; ensure SSL if needed by your provider
    return new (require('pg')).Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  }

  // Stripe client from app (server glue will attach)
  function getStripe(req) {
    return req.app.get('stripe');
  }

  // POST /client/:clientId/payouts/create
  router.post('/client/:clientId/payouts/create', requireClientOwner, async (req, res) => {
    const { clientId } = req.params;
    const { amount, currency = 'usd' } = req.body || {};
    if (!amount) return res.status(400).json({ error: 'amount is required' });

    const db = getDbClient();
    const stripe = getStripe(req);

    try {
      await db.connect();

      // Look up connected account for the client
      const ca = await db.query(
        'SELECT stripe_account_id FROM connect_accounts WHERE client_id = $1 ORDER BY id DESC LIMIT 1',
        [clientId]
      );
      const connectedAccountId = ca.rows[0]?.stripe_account_id;
      if (!connectedAccountId) {
        return res.status(400).json({ error: 'No connected Stripe account for client' });
      }

      // Create a payout on the connected account
      const payout = await stripe.payouts.create(
        { amount: Number(amount), currency },
        { stripeAccount: connectedAccountId }
      );

      // Ensure payouts table exists; create if missing
      await db.query(`
        CREATE TABLE IF NOT EXISTS payouts (
          id SERIAL PRIMARY KEY,
          client_id TEXT,
          payout_id TEXT,
          amount BIGINT,
          currency TEXT,
          status TEXT,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
      `);

      // Insert payout record
      await db.query(
        'INSERT INTO payouts (client_id, payout_id, amount, currency, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [clientId, payout.id, amount, currency, payout.status]
      );

      res.json({ clientId, payout });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await db.end();
    }
  });

  // GET /client/:clientId/payouts
  // Return payout history for the client
  router.get('/client/:clientId/payouts', requireClientOwner, async (req, res) => {
    const { clientId } = req.params;
    const db = getDbClient();

    try {
      await db.connect();
      const rows = await db.query(
        'SELECT payout_id, amount, currency, status, created_at FROM payouts WHERE client_id = $1 ORDER BY created_at DESC',
        [clientId]
      );
      res.json({ clientId, payouts: rows.rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      await db.end();
    }
  });

  // Expose a minimal placeholder for existing routes (dashboard/payments) if you implement later
  // Ensure you export the router
  return router;
}

module.exports = { createClientDashboardRouter };
