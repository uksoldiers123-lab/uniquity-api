js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const app = express();
app.use(bodyParser.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.post('/api/create-user', async (req, res) => {
  const { name, company, phone, email, password } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'Missing required fields' });

  try {
    // 1) Create a local user in Supabase (auth or a users table)
    // If you use Supabase Auth:
    const { user, error: signError } = await supabase.auth.signUp({ email, password }, { });
    if (signError) {
      // If user exists, you might instead fetch by email or create in a separate users table
      // For simplicity, continue with a separate row:
      // You can upsert into a users table instead of auth
    }

    // 2) Create Stripe Express account
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      metadata: { user_email: email, user_name: name },
    });

    // 3) Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: process.env.STRIPE_ONBOARDING_REFRESH_URL,
      return_url: process.env.STRIPE_ONBOARDING_RETURN_URL,
      type: 'account_onboarding',
    });

    // 4) Persist mapping in Supabase (store user profile and stripeAccountId)
    // Example: upsert into a users table
    const { data, error: upsertErr } = await supabase
      .from('users')
      .upsert([
        {
          email,
          name,
          company,
          phone,
          stripeAccountId: account.id,
          onboardingUrl: accountLink.url,
          // optional: user_id from auth session
        }
      ], { onConflict: 'email' });

    if (upsertErr) {
      return res.status(500).json({ message: 'Failed to save user' });
    }

    res.json({ userId: email, onboardingUrl: accountLink.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during onboarding' });
  }
});

app.listen(3000, () => console.log('API server listening on port 3000'));
