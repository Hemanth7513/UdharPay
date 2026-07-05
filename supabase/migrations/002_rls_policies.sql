-- ============================================================
-- UdharPay — Migration 002: Row Level Security (RLS)
-- ============================================================
-- Strict RLS: merchants can ONLY access their own data.
-- The reminder edge function uses the service_role key (bypasses RLS).
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE merchants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Merchants: user can only see/edit their own merchant row
-- ============================================================
CREATE POLICY "merchants: own row only"
  ON merchants
  FOR ALL
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ============================================================
-- Buyers: scoped to authenticated merchant
-- ============================================================
CREATE POLICY "buyers: own merchant only"
  ON buyers
  FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- Transactions: scoped to authenticated merchant
-- ============================================================
CREATE POLICY "transactions: own merchant only"
  ON transactions
  FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- Reminder History: merchants can read their own audit trail
-- (inserts are done by edge function using service_role — bypasses RLS)
-- ============================================================
CREATE POLICY "reminder_history: read own records"
  ON reminder_history
  FOR SELECT
  USING (
    transaction_id IN (
      SELECT t.id FROM transactions t
      JOIN merchants m ON t.merchant_id = m.id
      WHERE m.auth_user_id = auth.uid()
    )
  );
