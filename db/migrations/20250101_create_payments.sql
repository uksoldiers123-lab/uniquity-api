
-- Payments records
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  external_id TEXT,
  amount BIGINT,
  currency TEXT,
  status TEXT,
  client_code TEXT,
  connected_account_id TEXT,
  payment_intent_id TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
