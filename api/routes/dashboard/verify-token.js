const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const DASHBOARD_JWT_SECRET = process.env.DASHBOARD_JWT_SECRET;

router.post('/verify-token', (req, res) => {
  try {
    const { token } = req.body;
    const payload = jwt.verify(token, DASHBOARD_JWT_SECRET);
    // Optionally set a session cookie here
    res.json({ ok: true, userId: payload.userId });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = { verifyTokenRouter: router };
