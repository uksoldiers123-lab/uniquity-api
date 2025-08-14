
const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'dashboard.html'));
});

// Helper: Get user role from JWT
function getUserRole(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.role;
  } catch (error) {
    return null;
  }
}

// API endpoints
app.get('/api/overview', async (req, res) => {
  const role = getUserRole(req);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });

  try {
    let totalRevenue = 0;
    let totalPayments = 0;
    let activeCustomers = 0;

    if (role === 'admin') {
      // Admin: See all payments and customers
      const { data: payments } = await supabase.from('payments').select('*');
      const { data: customers } = await supabase.from('customers').select('*');

      totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0) / 100;
      totalPayments = payments.length;
      activeCustomers = customers.length;
    } else {
      // Client: See only their payments and customers
      const userId = jwt.decode(req.headers.authorization?.split(' ')[1]).userId;
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId);
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId);

      totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0) / 100;
      totalPayments = payments.length;
      activeCustomers = customers.length;
    }

    res.json({ totalRevenue, totalPayments, activeCustomers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overview data' });
  }
});

app.get('/api/payments', async (req, res) => {
  const role = getUserRole(req);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });

  try {
    let payments;
    if (role === 'admin') {
      // Admin: See all payments
      const { data, error } = await supabase.from('payments').select('*');
      if (error) throw error;
      payments = data;
    } else {
      // Client: See only their payments
      const userId = jwt.decode(req.headers.authorization?.split(' ')[1]).userId;
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      payments = data;
    }

    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.get('/api/customers', async (req, res) => {
  const role = getUserRole(req);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });

  try {
    let customers;
    if (role === 'admin') {
      // Admin: See all customers
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      customers = data;
    } else {
      // Client: See only their customers
      const userId = jwt.decode(req.headers.authorization?.split(' ')[1]).userId;
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      customers = data;
    }

    res.json({ customers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
