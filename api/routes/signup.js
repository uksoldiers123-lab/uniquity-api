const express = require('express');
const router = express.Router();

router.post('/signup', async (req, res) => {
  const { email, name } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  // Placeholder: integrate with Supabase Auth and Stripe Connect onboarding
  // 1) Create user in Supabase
  // 2) Create a Stripe Connect account for the user (Express)
  // 3) Create onboarding link and return to frontend
  res.json({ ok: true, message: 'Signup onboarding placeholder – implement with Supabase and Stripe' });
});

module.exports = { signupRouter: router };
