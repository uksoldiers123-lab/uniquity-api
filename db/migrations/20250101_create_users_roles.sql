
-- Basic users and roles
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS merchants_roles (
  merchant_id INTEGER REFERENCES merchants_clients(id),
  role_id INTEGER REFERENCES roles(id),
  PRIMARY KEY (merchant_id, role_id)
);
