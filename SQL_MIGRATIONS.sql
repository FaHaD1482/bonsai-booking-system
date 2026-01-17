-- ============================================================================
-- BONSAI BOOKING SYSTEM - DATABASE SCHEMA MIGRATIONS
-- ============================================================================

-- 1. ALTER BOOKINGS TABLE - Add new fields
-- Run these in Supabase SQL Editor

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
ADD COLUMN IF NOT EXISTS check_out_time VARCHAR(10) DEFAULT '12:00',
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Confirmed';

-- Change status enum type to allow new values
ALTER TABLE bookings 
ALTER COLUMN status TYPE VARCHAR(20);

-- 2. CREATE REFUND POLICIES TABLE
CREATE TABLE IF NOT EXISTS refund_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name VARCHAR(100) NOT NULL UNIQUE,
  days_before_checkin INTEGER NOT NULL,
  refund_percentage NUMERIC(5, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default refund policies
INSERT INTO refund_policies (policy_name, days_before_checkin, refund_percentage, description)
VALUES 
  ('72-0 Hours', 0, 0, 'Cancelled within 72 hours to check-in: 0% refund'),
  ('7-3 Days', 3, 50, 'Cancelled between 7 days to 72 hours: 50% refund'),
  ('7+ Days', 7, 85, 'Cancelled 7 days before check-in: 85% refund')
ON CONFLICT (policy_name) DO NOTHING;

-- 3. CREATE EXPENSES TABLE
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
  FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- 4. CREATE REVENUE TABLE (for tracking monthly revenue)
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

-- 5. ROW LEVEL SECURITY POLICIES

-- Enable RLS on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all bookings
CREATE POLICY "Allow authenticated users to view bookings"
  ON bookings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert bookings
CREATE POLICY "Allow authenticated users to insert bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update their own bookings
CREATE POLICY "Allow authenticated users to update bookings"
  ON bookings FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete bookings
CREATE POLICY "Allow authenticated users to delete bookings"
  ON bookings FOR DELETE
  USING (auth.role() = 'authenticated');

-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

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

-- Enable RLS on refund_policies table
ALTER TABLE refund_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view refund policies"
  ON refund_policies FOR SELECT
  USING (auth.role() = 'authenticated');

-- 6. CREATE FUNCTIONS FOR AUTOMATIC CALCULATIONS

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

-- Function to generate booking number
CREATE OR REPLACE FUNCTION generate_booking_no()
RETURNS VARCHAR AS $$
DECLARE
  booking_no VARCHAR;
BEGIN
  booking_no := 'BK' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || LPAD(NEXTVAL('booking_number_seq')::TEXT, 5, '0');
  RETURN booking_no;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for booking numbers
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1;

-- 7. CREATE TRIGGER FOR AUTOMATIC BOOKING_NO GENERATION
CREATE OR REPLACE FUNCTION auto_generate_booking_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_no IS NULL THEN
    NEW.booking_no := generate_booking_no();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_booking_no ON bookings;
CREATE TRIGGER trg_auto_booking_no
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION auto_generate_booking_no();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bookings_guest_phone ON bookings(guest_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_no ON bookings(booking_no);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

-- ============================================================================
-- HELPFUL QUERIES
-- ============================================================================

-- Get all bookings with refund calculation
-- SELECT 
--   b.*,
--   CASE 
--     WHEN b.status = 'Cancelled' THEN
--       CASE
--         WHEN (b.check_in::DATE - CURRENT_DATE) <= 0 THEN 0
--         WHEN (b.check_in::DATE - CURRENT_DATE) <= 3 THEN ROUND(b.price * 0.50, 2)
--         WHEN (b.check_in::DATE - CURRENT_DATE) >= 7 THEN ROUND(b.price * 0.85, 2)
--         ELSE ROUND(b.price * 0.50, 2)
--       END
--     ELSE 0
--   END AS calculated_refund
-- FROM bookings b
-- ORDER BY b.created_at DESC;

-- Get monthly revenue summary
-- SELECT 
--   DATE_TRUNC('month', created_at)::DATE AS month_year,
--   COUNT(*) AS total_bookings,
--   SUM(price) AS total_revenue,
--   SUM(advance) AS total_advance,
--   SUM(vat_amount) AS total_vat,
--   SUM(checkout_payable) AS total_payable,
--   SUM(CASE WHEN status = 'Cancelled' THEN refund_amount ELSE 0 END) AS total_refunds
-- FROM bookings
-- GROUP BY DATE_TRUNC('month', created_at)
-- ORDER BY month_year DESC;

-- Get monthly expenses by category
-- SELECT 
--   DATE_TRUNC('month', expense_date)::DATE AS month_year,
--   category,
--   COUNT(*) AS count,
--   SUM(amount) AS total_amount
-- FROM expenses
-- GROUP BY DATE_TRUNC('month', expense_date), category
-- ORDER BY month_year DESC, category;
