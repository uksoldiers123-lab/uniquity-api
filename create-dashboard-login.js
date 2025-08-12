require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const app = express();
app.use(bodyParser.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DASHBOARD_JWT_SECRET = process.env.DASHBOARD_JWT_SECRET; // short-lived
const DASHBOARD_BASE = 'https://dashboard.uniquitysolutions.com';

app.post('/api/create-dashboard-login', async (req, res) => {
  try {
    const { userId, email } = req.body;

    // Verify user exists (server-side)
    const { data, error } = await SUPABASE.auth.getUserById(userId);
    if (error || !data.user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Create a short-lived token
    const token = jwt.sign({ userId, email }, DASHBOARD_JWT_SECRET, { expiresIn: '10m' });
    const dashboardUrl = `${DASHBOARD_BASE}/login-redirect.html?token=${token}`;

    res.json({ dashboardUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Auth service listening on port ${port}`));
