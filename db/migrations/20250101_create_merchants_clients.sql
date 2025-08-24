File: 20250101_create_merchants_clients.sql
-- Create merchants/clients table
CREATE TABLE IF NOT EXISTS merchants_clients (
  id SERIAL PRIMARY KEY,
  client_code TEXT UNIQUE NOT NULL,
  connected_account_id TEXT,
  payout_percent NUMERIC(5,2) DEFAULT 0,
  application_fee_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'inactive',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

