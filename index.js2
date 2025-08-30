
require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public'))); // serve static frontend if needed

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// 1) Create user (basic or onboarding)
app.post('/api/create-user', async (req, res) => {
  const { name, email, company, phone, password, accountType } = req.body;

  if (!name || !email || !accountType) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // If you use Supabase Auth:
    // const { user, error } = await supabase.auth.signUp({ email, password });
    // const userId = user?.id || email; // fallback

    // If you store in a separate users table (no signup here), generate userId yourself:
    const userId = require('crypto').randomUUID();

    // 1a) Optional: create Supabase Auth user here (admin flow or using service_role)
    // If you want to avoid exposing admin tokens, manage users via admin endpoint elsewhere.

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

// 4) Transactions endpoint (example)
app.get('/api/transactions', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: 'Missing userId' });

  // Fetch from Supabase to get stripeAccountId
  const { data: rows } = await supabase.from('users').select('stripeAccountId').eq('id', userId).single();
  const stripeAccountId = rows?.stripeAccountId;
  if (!stripeAccountId) return res.status(404).json({ message: 'No Stripe account for user' });

  // Example: pull charges for the connected account
  try {
    const charges = await stripe.charges.list({ limit: 100, expand: ['data.customer'] });
    res.json({ transactions: charges.data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// 404 handler (unknown routes)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not Found', path: req.originalUrl });
  }
  res.status(404);
  res.type('html');
  res.sendFile(path.join(__dirname, '../public/404.html'));
});

// 500 error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500);
  res.type('html');
  res.sendFile(path.join(__dirname, '../public/500.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));

      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        window.location.href = '/login.html';
      }
    } else {
      alert(data.message || 'Failed to create account');
    }
  } catch (err) {
    console.error(err);
    alert('Network error. Try again.');
  }
}
</script>h
