CREATE TABLE IF NOT EXISTS payouts (
  id SERIAL PRIMARY KEY,
  client_id TEXT,
  payout_id TEXT,
  amount BIGINT,
  currency TEXT,
  status TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
