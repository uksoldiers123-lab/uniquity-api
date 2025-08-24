const express = require('express');
  const bcrypt = require('bcrypt');
  const { supabase } = require('../lib/db');

  const router = express.Router();

  // POST /api/create-account
  router.post('/create-account', async (req, res) => {
    try {
      // If you require authentication for this action, enforce it here
      // const userId = req.user && req.user.id;
      // if (!userId) return res.status(401).json({ ok: false, error: 'Not authenticated' });

      const { ownerName, businessName, phone, email, password } = req.body;

      // Basic validation (expand as needed)
      if (!ownerName || !businessName || !email || !password) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
      }

      // Hash the password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert new merchant into Supabase table 'merchants'
      const { data, error } = await supabase
        .from('merchants')
        .insert([
          {
            account_id: 'acct_' + Math.random().toString(36).slice(2, 9),
            company_name: businessName,
            owner_name: ownerName,
            phone,
            email,
            password_hash: passwordHash,
            status: 'active',
            created_at: new Date().toISOString(),
          },
        ])
        .select('*')
        .single();

      if (error) {
        console.error('DB insert error', error);
        return res.status(400).json({ ok: false, error: error.message || 'Onboarding failed' });
      }

      res.json({
        ok: true,
        accountId: data.account_id,
        accountStatus: data.status,
        redirectUrl: '/dashboard',
      });
    } catch (err) {
      console.error('Create account error', err);
      res.status(400).json({ ok: false, error: err.message || 'Onboarding failed' });
    }
  });

  module.exports = router;
