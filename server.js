'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Optional: Stripe (only used after you add keys in Render)
let stripe = null;
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

/* Helpers */
function errJson(res, code, msg, err) {
  // During debugging you can set DEBUG_ERRORS=true in Render env to see details
  const body = { error: msg };
  if (process.env.DEBUG_ERRORS === 'true' && err) {
    body.detail = String(err.message || err);
  }
  return res.status(code).json(body);
}

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

      await q(
        `insert into public.payments
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

      if (companyId) {
        const { rows } = await q('select payout_percent from public.companies where id=$1', [companyId]);
        const pct = rows[0]?.payout_percent ?? 0.70;
        const toCompany = Math.round(pi.amount * pct);

        await q(
          `insert into public.transfers (company_id, payment_id, provider, amount_cents, status)
           values ($1, (select id from public.payments where provider=$2 and provider_payment_id=$3), $4, 'queued')
           on conflict do nothing`,
          [companyId, 'stripe', pi.id, toCompany]
        );
      }
    }

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

/* API key middleware — verify in Postgres using crypt() and schema-qualified tables */
async function verifyApiKey(req, res, next) {
  const raw = req.get('X-API-Key');
  if (!raw) return errJson(res, 401, 'Missing API key');

  const prefix = raw.slice(0, 14);
  try {
    // Ensure pgcrypto is available in DB; the crypt() function comes from it.
    const { rows } = await q(
      `
      select c.id as company_id, c.name, c.slug, c.payout_percent
      from public.api_keys ak
      join public.companies c on c.id = ak.company_id
      where ak.key_prefix = $1
        and ak.status = 'active'
        and crypt($2, ak.key_hash) = ak.key_hash
      limit 1
      `,
      [prefix, raw]
    );

    const row = rows[0];
    if (!row) return errJson(res, 401, 'Invalid API key');

    req.company = {
      id: row.company_id,
      name: row.name,
      slug: row.slug,
      payout_percent: row.payout_percent
    };
    await q('update public.api_keys set last_used_at = now() where key_prefix = $1', [prefix]);
    return next();
  } catch (err) {
    console.error('verifyApiKey DB error:', err);
    return errJson(res, 500, 'Server error', err);
  }
}

/* Health check */
app.get('/api/health', (req, res) => res.json({ ok: true }));

/* Create Checkout Session (real payments; needs Stripe keys) */
app.post('/api/checkout', verifyApiKey, async (req, res) => {
  if (!stripe || !process.env.STRIPE_SECRET) {
    return errJson(res, 501, 'Stripe not configured yet. Use /api/dev/mock-payment to simulate.');
  }

  try {
    const { amount, currency = 'usd', invoiceNumber, payerEmail, payerName, memo } = req.body || {};
    if (!amount || !invoiceNumber || !payerEmail) {
      return errJson(res, 400, 'Missing required fields: amount, invoiceNumber, payerEmail');
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
    return errJson(res, 500, 'Could not create checkout', err);
  }
});

/* Dev helper: simulate a successful payment (no Stripe needed) */
app.post('/api/dev/mock-payment', verifyApiKey, async (req, res) => {
  try {
    const { amount, currency = 'usd', invoiceNumber } = req.body || {};
    if (!amount || !invoiceNumber) {
      return errJson(res, 400, 'Missing amount or invoiceNumber');
    }

    const pid = 'mock_pi_' + Math.random().toString(36).slice(2);

    await q(
      `insert into public.payments
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

    const { rows } = await q('select payout_percent from public.companies where id=$1', [req.company.id]);
    const pct = rows[0]?.payout_percent ?? 0.70;
    const toCompany = Math.round(Number(amount) * 100 * pct);

    await q(
      `insert into public.transfers (company_id, payment_id, provider, amount_cents, status)
       values ($1, (select id from public.payments where provider=$2 and provider_payment_id=$3), $4, 'queued')`,
      [req.company.id, 'mock', pid, toCompany]
    );

    return res.json({ ok: true, provider_payment_id: pid, transfer_cents: toCompany });
  } catch (err) {
    console.error('Mock payment error:', err);
    return errJson(res, 500, 'Mock insert failed', err);
  }
});

/* Start server */
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Uniquity API listening on :' + port);
});

 
