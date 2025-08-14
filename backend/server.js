require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const path = require('path'); // Add this line
const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(bodyParser.json());

// Serve static files from the frontend build folder
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: user, error } = await supabase.auth.getUser(token);
    if (error) throw error;

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
  if (req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Admins only' });
  }
};

// Admin: Fetch all payments
app.get('/admin/payments', authenticateUser, verifyAdmin, async (req, res) => {
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*');

    if (error) throw error;
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Fetch all users
app.get('/admin/users', authenticateUser, verifyAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Fetch all companies
app.get('/admin/companies', authenticateUser, verifyAdmin, async (req, res) => {
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*');

    if (error) throw error;
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve the frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
