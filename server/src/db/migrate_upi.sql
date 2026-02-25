-- UPI External Transactions Migration
-- Run this after initial schema migration

-- Add upi_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);

-- External transactions table for UPI payments (approval workflow)
CREATE TABLE IF NOT EXISTS external_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  to_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  group_id     UUID REFERENCES groups(id) ON DELETE SET NULL,
  amount       INTEGER NOT NULL CHECK (amount > 0),   -- in cents
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  upi_link     TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ext_tx_from   ON external_transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_ext_tx_to     ON external_transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ext_tx_status ON external_transactions(status);
