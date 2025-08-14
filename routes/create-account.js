const express = require('express');
const router = express.Router();

// Mock DB/save function (replace with real DB calls)
async function createMerchant(data, userId) {
  // Minimal validation
  if (!data.businessName || !data.ownerName || !data.email) {
    throw new Error('Missing required fields');
  }
  // Simulated created account object
  return {
    accountId: 'acct_' + Math.random().toString(36).slice(2, 9),
    status: 'active',
    ...data,
  };
}

// POST /create-account
router.post('/create-account', async (req, res) => {
  try {
    // If you require authentication, ensure req.user exists
    const userId = req.user && req.user.id;
    // If you require auth, uncomment the next line
    // if (!userId) return res.status(401).json({ ok: false, error: 'Not authenticated' });

    const payload = req.body;

    // Optional: add more strict validation here

    const merchant = await createMerchant(payload, userId);

    res.json({
      ok: true,
      redirectUrl: '/dashboard',
      accountStatus: merchant.status,
      accountId: merchant.accountId,
    });
  } catch (err) {
    console.error('Create account error', err.message);
    res.status(400).json({ ok: false, error: err.message || 'Onboarding failed' });
  }
});

module.exports = router;
