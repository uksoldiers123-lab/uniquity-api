--- a/migrations/20250826_init_rbac_profit_payouts.sql
+++ b/migrations/20250826_init_rbac_profit_payouts.sql
@@ -1,6 +1,120 @@
+-- RBAC basics
+CREATE TABLE IF NOT EXISTS roles (
+  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
+  name TEXT NOT NULL,
+  description TEXT
+);
+
+CREATE TABLE IF NOT EXISTS role_permissions (
+  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
+  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
+  permission TEXT NOT NULL,
+  UNIQUE (role_id, permission)
+);
+
+CREATE TABLE IF NOT EXISTS user_roles (
+  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
+  user_id UUID NOT NULL, -- adjust FK to your users table if present
+  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
+  created_at TIMESTAMP DEFAULT now(),
+  UNIQUE (user_id, role_id)
+);
+
+-- Audit logs
+CREATE TABLE IF NOT EXISTS audit_logs (
+  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
+  tenant_id UUID,
+  user_id UUID,
+  action TEXT NOT NULL,
+  detail JSONB,
+  created_at TIMESTAMP DEFAULT now()
+);
+
+-- Profit splits
+CREATE TABLE IF NOT EXISTS profit_splits (
+  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
+  name TEXT NOT NULL,
+  recipient_type TEXT NOT NULL, -- 'owner' or 'treasury'
+  tenant_id UUID,
+  percentage NUMERIC(5,4) NOT NULL,
+  active BOOLEAN DEFAULT true,
+  created_at TIMESTAMP DEFAULT now(),
+  CONSTRAINT check_sum CHECK (percentage >= 0 AND percentage <= 100)
+);
+
+-- Owners and Treasury accounts (Stripe integration)
+CREATE TABLE IF NOT EXISTS owner_accounts (
+  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
+  name TEXT,
+  stripe_account_id TEXT,
+  bank_account_id TEXT,
+  country TEXT,
+  currency TEXT
+);
+
+CREATE TABLE IF NOT EXISTS treasury_accounts (
+  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
+  name TEXT,
+  stripe_account_id TEXT,
+  currency TEXT
+);
+
+-- Payouts (per recipient)
+CREATE TABLE IF NOT EXISTS payouts (
+  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
+  recipient_account_id TEXT,
+  amount NUMERIC(18,2),
+  currency TEXT,
+  status TEXT,
+  payout_id TEXT,
+  tenant_id UUID,
+  created_at TIMESTAMP DEFAULT now()
+);
+
+-- Daily profit snapshot (optional, helpful for dashboards)
+CREATE TABLE IF NOT EXISTS daily_profit (
+  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
+  tenant_id UUID,
+  date DATE,
+  gross_amount NUMERIC(18,2) DEFAULT 0,
+  stripe_fees NUMERIC(18,2) DEFAULT 0,
+  treasury_share NUMERIC(18,2) DEFAULT 0,
+  owner1_share NUMERIC(18,2) DEFAULT 0,
+  owner2_share NUMERIC(18,2) DEFAULT 0,
+  net_amount NUMERIC(18,2) DEFAULT 0,
+  created_at TIMESTAMP DEFAULT now(),
+  UNIQUE (tenant_id, date)
+);
+
+-- Optional: seed default splits (Owner A 40%, Owner B 40%, Treasury 20%)
+INSERT INTO profit_splits (name, recipient_type, percentage, tenant_id, active, created_at)
+VALUES ('Owner A', 'owner', 40.0000, NULL, true, now()),
+       ('Owner B', 'owner', 40.0000, NULL, true, now()),
+       ('Treasury', 'treasury', 20.0000, NULL, true, now())
+;
+
+-- Indexes for quick lookups
+CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs (user_id);
+CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs (tenant_id);
+CREATE INDEX IF NOT EXISTS idx_daily_profit ON daily_profit (tenant_id, date);
```
