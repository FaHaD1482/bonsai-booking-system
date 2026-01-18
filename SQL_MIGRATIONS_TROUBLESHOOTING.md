# SQL MIGRATIONS - TROUBLESHOOTING GUIDE

## Error: "cannot alter type of a column used by a view or rule"

### Root Cause
The `bookings` table has a dependent view (`bookings_with_rooms`) that references the `status` column. You cannot change a column's type if it's used by a view.

### Solution

**Use the simplified migration file instead:**

1. **Open [SQL_MIGRATIONS_SUPABASE.sql](SQL_MIGRATIONS_SUPABASE.sql)**
   - This file handles the view dependency issue automatically

2. **Copy the ENTIRE content**
   - Select all (Ctrl+A)
   - Copy (Ctrl+C)

3. **In Supabase Dashboard:**
   - Go to your project
   - Open **SQL Editor**
   - Click the **+** button to create a new query
   - Paste the entire content
   - Click **Run** or press **Ctrl+Enter**

4. **Wait for completion**
   - The script will:
     - Drop the dependent view first
     - Alter the columns
     - Recreate the view with new columns
     - Create all new tables
     - Set up RLS policies
     - Create indexes

### Expected Output
```
✅ Success
Executed 1/1 queries
```

---

## Alternative: Manual Step-by-Step (if above fails)

If the complete script fails, run queries in this order:

### Step 1: Drop the view
```sql
DROP VIEW IF EXISTS bookings_with_rooms CASCADE;
```

### Step 2: Alter bookings table
```sql
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
```

### Step 3: Change status column type
```sql
ALTER TABLE bookings 
ALTER COLUMN status TYPE VARCHAR(20) USING status::text,
ALTER COLUMN status SET DEFAULT 'Confirmed';
```

### Step 4: Create refund_policies table
```sql
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

INSERT INTO refund_policies (policy_name, days_before_checkin, refund_percentage, description, is_custom)
VALUES 
  ('72-0 Hours', 0, 0, 'Cancelled within 72 hours to check-in: 0% refund', false),
  ('7-3 Days', 3, 50, 'Cancelled between 7 days to 72 hours: 50% refund', false),
  ('7+ Days', 7, 85, 'Cancelled 7 days before check-in: 85% refund', false),
  ('Custom Refund', NULL, NULL, 'Custom refund amount based on guest negotiation', true)
ON CONFLICT (policy_name) DO NOTHING;
```

### Step 5: Create expenses table
```sql
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
```

### Step 6: Create revenue_summary table
```sql
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
```

### Step 7: Enable RLS and create policies
```sql
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_policies ENABLE ROW LEVEL SECURITY;

-- Bookings policies
CREATE POLICY "Allow authenticated users to view bookings" ON bookings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert bookings" ON bookings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update bookings" ON bookings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete bookings" ON bookings FOR DELETE USING (auth.role() = 'authenticated');

-- Expenses policies
CREATE POLICY "Allow authenticated users to view expenses" ON expenses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert expenses" ON expenses FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update expenses" ON expenses FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete expenses" ON expenses FOR DELETE USING (auth.role() = 'authenticated');

-- Refund policies
CREATE POLICY "Allow authenticated users to view refund policies" ON refund_policies FOR SELECT USING (auth.role() = 'authenticated');
```

### Step 8: Create indexes
```sql
CREATE INDEX IF NOT EXISTS idx_bookings_guest_phone ON bookings(guest_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_no ON bookings(booking_no);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
```

### Step 9: Recreate the view
```sql
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
```

---

## Verification Checklist

After running the migrations, verify everything worked:

- [ ] **New columns in bookings table:**
  ```sql
  SELECT guest_phone, guest_email, booking_no, vat_applicable, vat_amount, 
         remarks, checkout_payable, refund_amount, num_adults, check_in_time, 
         check_out_time, status
  FROM bookings LIMIT 1;
  ```

- [ ] **Refund policies table exists:**
  ```sql
  SELECT * FROM refund_policies;
  ```
  Should return 4 rows with custom refund option

- [ ] **Expenses table exists:**
  ```sql
  SELECT * FROM expenses LIMIT 1;
  ```

- [ ] **Revenue summary table exists:**
  ```sql
  SELECT * FROM revenue_summary LIMIT 1;
  ```

- [ ] **View recreated:**
  ```sql
  SELECT * FROM bookings_with_rooms LIMIT 1;
  ```
  Should return booking data with room details

---

## Common Issues & Solutions

### Issue: "relation bookings_with_rooms already exists"
**Solution:** This is fine - the view was already created. Continue with next queries.

### Issue: "column bookings_no already exists"
**Solution:** This is expected - columns already added. Continue.

### Issue: "duplicate key value violates unique constraint"
**Solution:** The refund policies already exist. This is expected.

### Issue: Policy queries fail but table operations succeeded
**Solution:** Policies may already exist. This is normal. Check in Supabase UI.

---

## After Migrations Complete

1. **Check Supabase Tables:**
   - Go to Supabase Dashboard
   - Select your project
   - Go to **Tables** section
   - You should see:
     - `bookings` (with new columns)
     - `refund_policies` (new)
     - `expenses` (new)
     - `revenue_summary` (new)

2. **Next Steps:**
   - Run the application locally: `npm run dev`
   - The app should still work as before
   - Ready to implement new features

---

## Need Help?

If migrations still fail:
1. Take a screenshot of the error
2. Check Supabase status: https://status.supabase.com
3. Try again with a fresh browser tab
4. Contact support with the error message

---

## Files Reference

- **[SQL_MIGRATIONS_SUPABASE.sql](SQL_MIGRATIONS_SUPABASE.sql)** ← Use this one
- [SQL_MIGRATIONS.sql](SQL_MIGRATIONS.sql) (original - may have view issues)
