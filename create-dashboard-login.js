require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// Basic config validation (at startup)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DASHBOARD_JWT_SECRET = process.env.DASHBOARD_JWT_SECRET;
const DASHBOARD_BASE = process.env.DASHBOARD_BASE || 'https://dashboard.uniquitysolutions.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set environment variables accordingly.');
  process.exit(1);
}
if (!DASHBOARD_JWT_SECRET) {
  console.error('Missing DASHBOARD_JWT_SECRET. Set environment variable accordingly.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Endpoint to create a dashboard login link
app.post('/api/create-dashboard-login', async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing userId or email' });
    }

    // Verify user exists on the backend
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

// Use a specific port via env or default to 3000
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
