-- ============================================================================
-- BONSAI BOOKING SYSTEM - SQL MIGRATIONS (SIMPLIFIED FOR SUPABASE)
-- ============================================================================
-- This version handles the view dependency issue gracefully
-- Copy and paste this entire script into Supabase SQL Editor

-- STEP 0: Drop dependent views FIRST
DROP VIEW IF EXISTS bookings_with_rooms CASCADE;

-- ============================================================================
-- STEP 1: ALTER BOOKINGS TABLE - Add new fields
-- ============================================================================

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS booking_no VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS vat_applicable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remarks TEXT,
ADD COLUMN IF NOT EXISTS checkout_payable NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS num_adults INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS check_in_time VARCHAR(10) DEFAULT '14:00',
ADD COLUMN IF NOT EXISTS check_out_time VARCHAR(10) DEFAULT '12:00';

-- Handle status column type change (if needed)
DO $$ 
BEGIN
  ALTER TABLE bookings ALTER COLUMN status TYPE VARCHAR(20) USING status::TEXT;
  ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'Confirmed';
EXCEPTION WHEN OTHERS THEN
  -- Column already exists as VARCHAR, skip
  NULL;
END $$;

-- ============================================================================
-- STEP 2: CREATE REFUND POLICIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS refund_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name VARCHAR(100) NOT NULL UNIQUE,
  days_before_checkin INTEGER,
  refund_percentage NUMERIC(5, 2),
  description TEXT,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default refund policies
INSERT INTO refund_policies (policy_name, days_before_checkin, refund_percentage, description, is_custom)
VALUES 
  ('72-0 Hours', 0, 0, 'Cancelled within 72 hours to check-in: 0% refund', false),
  ('7-3 Days', 3, 50, 'Cancelled between 7 days to 72 hours: 50% refund', false),
  ('7+ Days', 7, 85, 'Cancelled 7 days before check-in: 85% refund', false),
  ('Custom Refund', NULL, NULL, 'Custom refund amount based on guest negotiation', true)
ON CONFLICT (policy_name) DO NOTHING;

-- ============================================================================
-- STEP 3: CREATE EXPENSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  amount NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================================
-- STEP 4: CREATE REVENUE SUMMARY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS revenue_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year DATE NOT NULL UNIQUE,
  total_bookings INTEGER DEFAULT 0,
  total_revenue NUMERIC(12, 2) DEFAULT 0,
  total_advance NUMERIC(12, 2) DEFAULT 0,
  total_vat NUMERIC(12, 2) DEFAULT 0,
  total_payable NUMERIC(12, 2) DEFAULT 0,
  total_refunds NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Bookings table RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated users to insert bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated users to update bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated users to delete bookings" ON bookings;

CREATE POLICY "Allow authenticated users to view bookings"
  ON bookings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update bookings"
  ON bookings FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete bookings"
  ON bookings FOR DELETE
  USING (auth.role() = 'authenticated');

-- Expenses table RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated users to insert expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated users to update expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated users to delete expenses" ON expenses;

CREATE POLICY "Allow authenticated users to view expenses"
  ON expenses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update expenses"
  ON expenses FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete expenses"
  ON expenses FOR DELETE
  USING (auth.role() = 'authenticated');

-- Refund policies table RLS
ALTER TABLE refund_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view refund policies" ON refund_policies;

CREATE POLICY "Allow authenticated users to view refund policies"
  ON refund_policies FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 6: CREATE DATABASE FUNCTIONS
-- ============================================================================

-- Function to calculate VAT
CREATE OR REPLACE FUNCTION calculate_vat(price NUMERIC, vat_applicable BOOLEAN)
RETURNS NUMERIC AS $$
BEGIN
  IF vat_applicable THEN
    RETURN ROUND(price * 0.025, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate checkout payable
CREATE OR REPLACE FUNCTION calculate_checkout_payable(
  total_price NUMERIC,
  advance_paid NUMERIC,
  vat_amt NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND((total_price + vat_amt) - advance_paid, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bookings_guest_phone ON bookings(guest_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_no ON bookings(booking_no);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);

-- ============================================================================
-- STEP 8: RECREATE VIEWS
-- ============================================================================

-- Recreate bookings_with_rooms view
CREATE OR REPLACE VIEW bookings_with_rooms AS
SELECT 
  b.id,
  b.guest_name,
  b.guest_phone,
  b.guest_email,
  b.booking_no,
  b.room_id,
  b.check_in,
  b.check_out,
  b.check_in_time,
  b.check_out_time,
  b.price,
  b.advance,
  b.vat_applicable,
  b.vat_amount,
  b.checkout_payable,
  b.refund_amount,
  b.remarks,
  b.guest_count,
  b.num_adults,
  b.status,
  b.created_at,
  b.updated_at,
  r.name AS room_name,
  r.capacity,
  r.type AS room_type
FROM bookings b
LEFT JOIN rooms r ON b.room_id = r.id;

-- ============================================================================
-- SUCCESS! All migrations completed
-- ============================================================================
-- The database is now ready for the new features:
-- ✅ Enhanced bookings with phone, email, VAT, remarks
-- ✅ Refund policies with custom refund option
-- ✅ Expenses tracking system
-- ✅ Revenue summary tracking
-- ✅ RLS security policies
-- ✅ Performance indexes
