--- a/src/api/v1/finances/summary.js
+++ b/src/api/v1/finances/summary.js
@@ -1,40 +1,160 @@
+const { hasPermission } = require('../auth/rbac');
+const db = require('../../db');
+
+// GET /api/v1/finances/summary?interval=hour|day|week|month|quarter|year
+app.get('/api/v1/finances/summary', async (req, res) => {
+  const userId = req.user?.id;
+  if (!userId || !(await hasPermission(userId, 'view_finances'))) {
+    return res.status(403).json({ error: 'Forbidden' });
+  }
+  const interval = req.query.interval || 'day';
+  // Implement bucketed aggregation per tenant using your schema
+  // This is a placeholder; replace with real SQL that buckets by the interval
+  const data = [
+    { t: new Date(), tenant: 'Tenant A', gross: 1000, net: 950, stripeFees: 50, owner1Share: 400, owner2Share: 400, treasuryShare: 200 }
+  ];
+  res.json({ interval, data });
+});
