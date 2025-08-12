const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
app.use(express.json());

const DASHBOARD_JWT_SECRET = process.env.DASHBOARD_JWT_SECRET;

// This endpoint verifies the token and can establish a session / map to tenant
app.post('/verify-token', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const payload = jwt.verify(token, DASHBOARD_JWT_SECRET);

    // Optional: map payload.userId to tenant/account and create a session
    // For example: req.session.userId = payload.userId; (if you have session middleware)

    res.json({ ok: true, userId: payload.userId, email: payload.email });
  } catch (e) {
    console.error('Dashboard token verification failed:', e);
    res.status(401).json({ error: 'Invalid token' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Dashboard verify-token listening on ${port}`));
