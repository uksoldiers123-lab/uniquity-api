--- a/src/api/v1/auth/rbac.js
+++ b/src/api/v1/auth/rbac.js
@@ -0,0 +1,120 @@
+// Simple RBAC helper (adapt to your auth system)
+async function getUserRoles(userId) {
+  // fetch user roles
+  // replace with your actual data access
+  const res = await db.query('SELECT role_id FROM user_roles WHERE user_id = $1', [userId]);
+  return res.rows.map(r => r.role_id);
+}
+
+async function getRolePermissions(roleId) {
+  const res = await db.query('SELECT permission FROM role_permissions WHERE role_id = $1', [roleId]);
+  return res.rows.map(r => r.permission);
+}
+
+async function getUserPermissions(userId) {
+  const roles = await getUserRoles(userId);
+  const per = new Set();
+  for (const rid of roles) {
+    const perms = await getRolePermissions(rid);
+    perms.forEach(p => per.add(p));
+  }
+  return Array.from(per);
+}
+
+async function hasPermission(userId, perm) {
+  const perms = await getUserPermissions(userId);
+  return perms.includes(perm);
+}
+
+module.exports = { hasPermission, getUserPermissions };
