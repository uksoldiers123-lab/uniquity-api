const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase config. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DASHBOARD_JWT_SECRET = process.env.DASHBOARD_JWT_SECRET;
const DASHBOARD_BASE = process.env.DASHBOARD_BASE || 'https://dashboard.uniquitysolutions.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

app.post('/api/create-dashboard-login', async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing userId or email' });
    }

    // Verify user exists on the backend (server-side)
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Create a short-lived token with user identity
    const token = jwt.sign({ userId, email }, DASHBOARD_JWT_SECRET, { expiresIn: '10m' });

    // Build the dashboard login URL
    const dashboardUrl = `${DASHBOARD_BASE}/login-redirect.html?token=${token}`;

    res.json({ dashboardUrl });
  } catch (err) {
    console.error('Error in /api/create-dashboard-login:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API listening on ${port}`));const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Auth service listening on port ${port}`));
