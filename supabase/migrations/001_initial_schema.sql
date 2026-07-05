-- ============================================================
-- UdharPay — Migration 001: Initial Schema
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Table: merchants
-- Core user data. One row per authenticated user.
-- ============================================================
CREATE TABLE IF NOT EXISTS merchants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  phone_number  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: buyers
-- Stores buyer contact info per merchant.
-- ============================================================
CREATE TABLE IF NOT EXISTS buyers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id         UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  buyer_name          TEXT NOT NULL,
  buyer_phone         TEXT NOT NULL,
  total_outstanding   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  last_transaction_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyers_merchant_id ON buyers(merchant_id);

-- ============================================================
-- Table: transactions
-- Replaces a single ledger table for better tracking.
-- ============================================================
CREATE TYPE transaction_status AS ENUM (
  'unpaid',
  'paid',
  'partial',
  'disputed',
  'written_off',
  'paused'
);

CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  merchant_id      UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  amount           NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  due_date         DATE NOT NULL,
  status           transaction_status NOT NULL DEFAULT 'unpaid',
  notes            TEXT,
  reminder_paused  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id    ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status      ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date    ON transactions(due_date);

-- ============================================================
-- Table: reminder_history
-- Audit trail of every WhatsApp reminder sent.
-- ============================================================
CREATE TYPE reminder_tone AS ENUM (
  'polite',    -- Day -3: Namaste reminder
  'neutral',   -- Day 0:  Due today
  'firm'       -- Day +7: Firm follow-up
);

CREATE TYPE delivery_status AS ENUM (
  'sent',
  'delivered',
  'read',
  'failed'
);

CREATE TABLE IF NOT EXISTS reminder_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tone_used       reminder_tone NOT NULL,
  delivery_status delivery_status NOT NULL DEFAULT 'sent',
  wa_message_id   TEXT,  -- WhatsApp message ID for delivery tracking
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_history_transaction_id ON reminder_history(transaction_id);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER buyers_updated_at
  BEFORE UPDATE ON buyers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
