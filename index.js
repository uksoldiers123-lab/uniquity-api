require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve static frontend if needed

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// 1) Create user (basic or onboarding)
app.post('/api/create-user', async (req, res) => {
  const { name, email, company, phone, password, accountType } = req.body;

  if (!name || !email || !accountType) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Create Supabase Auth user
    const { user, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signupError) {
      return res.status(400).json({ message: signupError.message });
    }

    const userId = user.id; // Use the Supabase-generated user ID

    // 2) If onboarding is required (accountType !== 'basic')
    let onboardingUrl = null;
    let stripeAccountId = null;

    if (accountType.toLowerCase() !== 'basic') {
      // Create Stripe Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email,
        metadata: { userId, name },
      });

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: process.env.STRIPE_ONBOARDING_REFRESH_URL,
        return_url: process.env.STRIPE_ONBOARDING_RETURN_URL,
        type: 'account_onboarding',
      });

      stripeAccountId = account.id;
      onboardingUrl = accountLink.url;
    }

    // 3) Persist to Supabase 'users' table
    const { data, error: dbError } = await supabase
      .from('users')
      .upsert([
        {
          id: userId,
          email,
          name,
          company,
          phone,
          account_type: accountType,
          stripeAccountId,
          onboardingUrl,
        }
      ], { onConflict: 'id' });

    if (dbError) {
      console.error(dbError);
      return res.status(500).json({ message: 'Failed to save user' });
    }

    res.json({ userId, onboardingUrl });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'Server error during onboarding' });
  }
});

// Other endpoints remain the same...

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
