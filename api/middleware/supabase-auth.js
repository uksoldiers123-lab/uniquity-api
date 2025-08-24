const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');

// Simple, not-production-ready placeholder for Supabase JWT verification
// In production, fetch public keys from Supabase (JWKS) and verify the token.
async function verifySupabaseJwt(token) {
  // Placeholder: decode without verification (DO NOT use in prod)
  try {
    const payload = jwt.decode(token, { complete: true });
    return payload ? payload.payload : null;
  } catch {
    return null;
  }
}

async function supabaseAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const claims = await verifySupabaseJwt(token);
  if (!claims) return res.status(401).json({ error: 'Invalid token' });
  // Attach user to request (customize fields as per your app_metadata)
  req.user = claims;
  next();
}

module.exports = { supabaseAuthMiddleware };
