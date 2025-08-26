--- a/src/api/v1/finances/today.js
+++ b/src/api/v1/finances/today.js
@@ -1,50 +1,140 @@
+const { hasPermission } = require('../auth/rbac');
+const db = require('../../db');
+
+// GET /api/v1/finances/today
+app.get('/api/v1/finances/today', async (req, res) => {
+  const userId = req.user?.id;
+  if (!userId || !(await hasPermission(userId, 'view_finances'))) {
+    return res.status(403).json({ error: 'Forbidden' });
+  }
+  // Compute today's figures per-tenant
+  // Placeholder logic; replace with real aggregation from payments table
+  const todayStart = new Date();
+  todayStart.setHours(0,0,0,0);
+  const todayEnd = new Date(todayStart);
+  todayEnd.setDate(todayStart.getDate() + 1);
+
+  const { rows } = await db.query(
+    `SELECT tenant_id, SUM(amount) AS gross, SUM(stripe_fees) AS stripe_fees, SUM(platform_fees) AS platform_fees
+     FROM payments
+     WHERE created_at >= $1 AND created_at < $2
+     GROUP BY tenant_id`, [todayStart, todayEnd]
+  );
+
+  // Load current splits to compute shares
+  const splitRows = await db.query('SELECT name, percentage FROM profit_splits WHERE active = true');
+  let totalOwner1 = 0, totalOwner2 = 0, totalTreasury = 0;
+  // simple equal distribution fallback if no splits defined
+  const o1p = 0.4, o2p = 0.4, tp = 0.2;
+  const perTenant = rows.map(r => {
+    const gross = Number(r.gross) || 0;
+    const owner1 = gross * o1p;
+    const owner2 = gross * o2p;
+    const treasury = gross * tp;
+    const net = gross - Number(r.stripe_fees || 0) - Number(r.platform_fees || 0) -
+      (owner1 + owner2 + treasury);
+    totalOwner1 += owner1;
+    totalOwner2 += owner2;
+    totalTreasury += treasury;
+    return {
+      tenant_id: r.tenant_id,
+      gross,
+      stripe_fees: Number(r.stripe_fees) || 0,
+      platform_fees: Number(r.platform_fees) || 0,
+      owner1_share: owner1,
+      owner2_share: owner2,
+      treasury_share: treasury,
+      net
+    };
+  });
+
+  res.json({
+    today: perTenant,
+    totals: {
+      gross: perTenant.reduce((a,b)=>a+b.gross,0),
+      stripe_fees: perTenant.reduce((a,b)=>a+b.stripe_fees,0),
+      platform_fees: perTenant.reduce((a,b)=>a+b.platform_fees,0),
+      owner1_share: perTenant.reduce((a,b)=>a+b.owner1_share,0),
+      owner2_share: perTenant.reduce((a,b)=>a+b.owner2_share,0),
+      treasury_share: perTenant.reduce((a,b)=>a+b.treasury_share,0),
+      net: perTenant.reduce((a,b)=>a+b.net,0),
+    }
+  });
+});
