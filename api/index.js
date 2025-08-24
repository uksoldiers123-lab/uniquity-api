const express = require('express');
const bodyParser = require('body-parser');
const paymentsRouter = require('./payments/create-payment-intent-for-client'); // path to the route file
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Mount API routes
app.use('/api', (req, res, next) => {
  // Simple passthrough; you can add auth/middleware here
  next();
});

// Public payments endpoint
app.use('/api', paymentsRouter);

// Health
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening at http://localhost:${port}`);
});
