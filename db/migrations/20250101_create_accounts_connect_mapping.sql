File: 20250101_create_accounts_connect_mapping.sql
-- Mapping between environment, clientCode and Stripe Connect account
CREATE TABLE IF NOT EXISTS accounts_connect_mapping (
  id SERIAL PRIMARY KEY,
  client_code TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  connected_account_id TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  UNIQUE (client_code, environment)
);

