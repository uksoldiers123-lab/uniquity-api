
'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

let stripe = null; // Optional: only used when STRIPE_SECRET is set
if (process.env.STRIPE_SECRET) {
  const Stripe = require('stripe');
  stripe = Stripe(process.env.STRIPE_SECRET);
}

const app = express();

/* Database */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL ? { rejectUnauthorized: false } : false
});
const q = (text, params) => pool.query(text, params);

/* Stripe webhook (raw body) — mount BEFORE express.json() */
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(501).send('Stripe not configured');
  }
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const meta = pi.metadata || {};
      const companyId = meta.companyId || null;

      // Record payment
      await q(
        `insert into payments
          (company_id, provider, provider_payment_id, charge_id, invoice_number,
           amount_cents, currency, fee_cents, net_cents, status, metadata)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         on conflict (provider, provider_payment_id) do nothing`,
        [
          companyId,
          'stripe',
          pi.id,
          pi.latest_charge || null,
          meta.invoiceNumber || null,
          pi.amount,
          pi.currency || 'usd',
          0,
          null,
          pi.status || 'succeeded',
          meta
        ]
      );

      // Earmark 70% transfer
      if (companyId) {
        const { rows } = await q('select payout_percent from companies where id=$1', [companyId]);
        const pct = rows[0]?.payout_percent ?? 0.70;
        const toCompany = Math.round(pi.amount * pct);

        await q(
          `insert into transfers (company_id, payment_id, provider, amount_cents, status)
           values ($1, (select id from payments where provider=$2 and provider_payment_id=$3), $4, 'queued')
           on conflict do nothing`,
          [companyId, 'stripe', pi.id, toCompany]
        );
      }
    }

    // Optional: handle charge.refunded to mark reversals

    return res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    return res.sendStatus(400);
  }
});

/* JSON for all other routes */
app.use(express.json());

/* CORS */
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    }
  })
);

/* API key middleware: X-API-Key (company embed key) */
async function verifyApiKey(req, res, next) {
  try {
    const raw = req.get('X-API-Key');
    if (!raw) return res.status(401).json({ error: 'Missing API key' });
    const prefix = raw.slice(0, 14);

    const { rows } = await q(
      'select * from api_keys where key_prefix=$1 and status=$2',
      [prefix, 'active']
    );

    for (const row of rows) {
      const ok = await bcrypt.compare(raw, row.key_hash);
      if (ok) {
        const c = await q('select * from companies where id=$1', [row.company_id]);
        req.company = c.rows[0];
        await q('update api_keys set last_used_at=now() where id=$1', [row.id]);
        return next();
      }
    }

    return res.status(401).json({ error: 'Invalid API key' });
  } catch (err) {
    console.error('verifyApiKey error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/* Health check */
app.get('/api/health', (req, res) => res.json({ ok: true }));

/* Create Checkout Session (real payments) */
app.post('/api/checkout', verifyApiKey, async (req, res) => {
  if (!stripe || !process.env.STRIPE_SECRET) {
    return res.status(501).json({ error: 'Stripe not configured yet. Use /api/dev/mock-payment to simulate.' });
  }

  try {
    const { amount, currency = 'usd', invoiceNumber, payerEmail, payerName, memo } = req.body || {};
    if (!amount || !invoiceNumber || !payerEmail) {
      return res.status(400).json({ error: 'Missing required fields: amount, invoiceNumber, payerEmail' });
    }

    const successUrl =
      (process.env.SUCCESS_URL ||
        'https://uksoldiers123-lab.github.io/Uniquely-solutions/make-payments-success.html') + '?ref={CHECKOUT_SESSION_ID}';
    const cancelUrl =
      process.env.CANCEL_URL ||
      'https://uksoldiers123-lab.github.io/Uniquely-solutions/make-payments.html?canceled=1';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: payerEmail,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: Math.round(Number(amount) * 100),
            product_data: { name: `Invoice ${invoiceNumber} — ${req.company.name}` }
          },
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        metadata: {
          companyId: req.company.id,
          companySlug: req.company.slug,
          invoiceNumber,
          payerName: payerName || '',
          memo: memo || ''
        },
        receipt_email: payerEmail
      }
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Create checkout error:', err);
    return res.status(500).json({ error: 'Could not create checkout' });
  }
});

/* Dev helper: simulate a successful payment (no Stripe needed) */
app.post('/api/dev/mock-payment', verifyApiKey, async (req, res) => {
  try {
    const { amount, currency = 'usd', invoiceNumber } = req.body || {};
    if (!amount || !invoiceNumber) {
      return res.status(400).json({ error: 'Missing amount or invoiceNumber' });
    }

    const pid = 'mock_pi_' + Math.random().toString(36).slice(2);

    await q(
      `insert into payments
        (company_id, provider, provider_payment_id, charge_id, invoice_number,
         amount_cents, currency, fee_cents, net_cents, status, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        req.company.id,
        'mock',
        pid,
        null,
        invoiceNumber,
        Math.round(Number(amount) * 100),
        currency,
        0,
        null,
        'succeeded',
        {}
      ]
    );

    const { rows } = await q('select payout_percent from companies where id=$1', [req.company.id]);
    const pct = rows[0]?.payout_percent ?? 0.70;
    const toCompany = Math.round(Number(amount) * 100 * pct);

    await q(
      `insert into transfers (company_id, payment_id, provider, amount_cents, status)
       values ($1, (select id from payments where provider=$2 and provider_payment_id=$3), $4, 'queued')`,
      [req.company.id, 'mock', pid, toCompany]
    );

    return res.json({ ok: true, provider_payment_id: pid, transfer_cents: toCompany });
  } catch (err) {
    console.error('Mock payment error:', err);
    return res.status(500).json({ error: 'Mock insert failed' });
  }
});

/* Start server */
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Uniquity API listening on :' + port);
});

Environment variables you must set on Render (Add each in Settings > Environment):
- DATABASE_URL = postgresql://postgres:%28%20%23FreeME2024%29@db.ziltrcaehpshkwganlcy.supabase.co:5432/postgres
- DATABASE_SSL = true
- CORS_ORIGINS = https://uksoldiers123-lab.github.io
- SUCCESS_URL = https://uksoldiers123-lab.github.io/Uniquely-solutions/make-payments-success.html
- CANCEL_URL = https://uksoldiers123-lab.github.io/Uniquely-solutions/make-payments.html?canceled=1
- Later, when you open Stripe:
  - STRIPE_SECRET = sk_test_xxx
  - STRIPE_WEBHOOK_SECRET = whsec_xxx

How to test now (without Stripe)
- Health: open https://YOUR-SERVICE.onrender.com/api/health
- Mock payment (use Hoppscotch or curl):
  POST https://YOUR-SERVICE.onrender.com/api/dev/mock-payment
  Headers:
    Content-Type: application/json
    X-API-Key: upk_live_YOUR_COMPANY_KEY
  Body:
    { "amount": 25.00, "invoiceNumber": "acme-1001" }
- Check Supabase Table Editor: payments and transfers should show new rows.

