const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const adminRoutes = require('./admin/routes'); // patch path

// Middleware
app.use(bodyParser.json());

// Your existing routes...
// TODO: preserve existing app.use(...) and routes

// Mount Admin API
app.use('/admin', adminRoutes);

// Health
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});

