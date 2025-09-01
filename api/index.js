
const express = require('express');
const app = express();

const clientRoutes = require('./routes/client');
const adminRoutes = require('./routes/admin'); // ensure this points to admin/index.js

app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);

// Other middleware and routes...
module.exports = app;
