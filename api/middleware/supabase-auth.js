const jwt = require('jsonwebtoken');
const axios = require('axios');

// New: read JWKS URL from env for JWT verification
const SUPABASE_JWKS_URL = process.env.SUPABASE_JWKS_URL;

// Placeholder: swap in a real JWKS-based verifier against Supabase
async function verifySupabaseJwt(token) {
  try {
    // Placeholder: decode only (do not rely on this in production)
    const payload = jwt.decode(token, { complete: true });
    return payload ? payload.payload : null;
  } catch {
    return null;
  }
}

async function supabaseAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const claims = await verifySupabaseJwt(parts[1]);
  if (!claims) return res.status(401).json({ error: 'Invalid token' });
  req.user = claims;
  next();
}

module.exports = { supabaseAuthMiddleware };
