CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  client_id TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connect_accounts (
  id SERIAL PRIMARY KEY,
  client_id TEXT REFERENCES clients(client_id),
  stripe_account_id TEXT,
  status TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  UNIQUE (client_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  client_id TEXT REFERENCES clients(client_id),
  stripe_payment_intent_id TEXT,
  amount BIGINT,
  currency TEXT,
  status TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
