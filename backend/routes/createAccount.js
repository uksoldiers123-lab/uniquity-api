const express = require('express');
  const router = express.Router();
  const Stripe = require('stripe');
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  // POST /api/connect/create-account
  // Body: { merchantId, email, companyName, ownerName, country (e.g., 'US'), businessType ('card_payment'), metadata? }
  router.post('/connect/create-account', async (req, res) => {
    try {
      const { email, companyName, ownerName, country = 'US', businessType = 'individual', metadata } = req.body;

      if (!email || !companyName || !ownerName) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
      }

      // 1) Create a Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country,
        email,
        business_type: businessType,
        metadata: metadata || { merchant: companyName },
      });

      // 2) (Optional) Create an onboarding link for the merchant
      const origin = req.headers.origin || '';
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: process.env.REFRESH_URL || `${origin}/onboard/refresh`,
        return_url: process.env.RETURN_URL || `${origin}/dashboard`,
        type: 'account_onboarding',
      });

      // 3) Save to your DB (pseudo code; adapt to your DB)
      // await saveConnectAccountToDB({
      //   id: someInternalId,
      //   account_id: account.id,
      //   email,
      //   company_name: companyName,
      //   owner_name: ownerName,
      //   onboarding_url: accountLink.url,
      //   onboarding_session_id: accountLink.id,
      //   onboarding_completed: false,
      //   status: 'pending'
      // });

      res.json({
        ok: true,
        accountId: account.id,
        onboardingUrl: accountLink.url,
        onboardingSessionId: accountLink.id,
        onboardingStatus: 'pending'
      });
    } catch (err) {
      console.error('Connect create-account error', err);
      res.status(400).json({ ok: false, error: err.message || 'Could not create connect account' });
    }
  });

  // GET /api/connect/accounts - list connected accounts for the dashboard
  // This should fetch from your DB
  router.get('/connect/accounts', async (_req, res) => {
    // Replace with real DB fetch
    const accounts = []; // [{ id, account_id, email, company_name, owner_name, status, onboarding_completed }]
    res.json({ ok: true, accounts });
  });

  module.exports = router;
