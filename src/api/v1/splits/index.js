--- a/src/api/v1/splits/index.js
+++ b/src/api/v1/splits/index.js
@@ -1,50 +1,150 @@
+const { hasPermission } = require('../../auth/rbac');
+const db = require('../../db');
+
+// GET splits
+app.get('/api/v1/splits', async (req, res) => {
+  const userId = req.user?.id;
+  if (!userId || !(await hasPermission(userId, 'manage_splits'))) {
+    return res.status(403).json({ error: 'Forbidden' });
+  }
+  const { rows } = await db.query('SELECT * FROM profit_splits WHERE active = true');
+  res.json({ splits: rows });
+});
+
+// POST create a split
+app.post('/api/v1/splits', async (req, res) => {
+  const userId = req.user?.id;
+  if (!userId || !(await hasPermission(userId, 'manage_splits'))) {
+    return res.status(403).json({ error: 'Forbidden' });
+  }
+  const { name, recipient_type, tenant_id, percentage, active } = req.body;
+  const result = await db.query(
+    `INSERT INTO profit_splits (name, recipient_type, tenant_id, percentage, active)
+     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
+    [name, recipient_type, tenant_id || null, percentage, active ?? true]
+  );
+  res.json({ split: result.rows[0] });
+});
+
+// PUT update a split
+app.put('/api/v1/splits/:id', async (req, res) => {
+  const userId = req.user?.id;
+  if (!userId || !(await hasPermission(userId, 'manage_splits'))) {
+    return res.status(403).json({ error: 'Forbidden' });
+  }
+  const { percentage, active } = req.body;
+  const { id } = req.params;
+  const result = await db.query(
+    `UPDATE profit_splits SET percentage = $1, active = $2 WHERE id = $3 RETURNING *`,
+    [percentage, active, id]
+  );
+  res.json({ split: result.rows[0] });
