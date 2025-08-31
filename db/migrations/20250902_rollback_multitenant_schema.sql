DROP POLICY IF EXISTS "Invoices: tenant or admin" ON invoices;
DROP POLICY IF EXISTS "Payments: tenant or admin" ON payments;
DROP POLICY IF EXISTS "Subscriptions: tenant or admin" ON subscriptions;
DROP POLICY IF EXISTS "Tenants: admin or self" ON tenants;
DROP POLICY IF EXISTS "Users: admins only" ON users;

ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS tenant_users;
DROP TABLE IF EXISTS tenants;
