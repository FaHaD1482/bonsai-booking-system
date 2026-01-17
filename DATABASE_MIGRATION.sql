-- Migration: Fresh Room Management System
-- Date: January 17, 2026
-- Purpose: Create clean schema with Row Level Security for rooms and bookings

-- ========== CLEANUP: Drop existing objects ==========
-- Step 1: Drop dependent view first
DROP VIEW IF EXISTS bookings_with_rooms CASCADE;

-- Step 2: Drop tables (this removes all data - backup first!)
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- ========== CREATE FRESH SCHEMA ==========

-- Step 3: Create rooms table (UUID primary key)
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  type TEXT DEFAULT 'Standard',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create bookings table (with proper UUID foreign key)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name TEXT NOT NULL,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  advance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  guest_count INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Create indexes for performance
CREATE INDEX idx_bookings_room_id ON bookings(room_id);
CREATE INDEX idx_bookings_check_in ON bookings(check_in);
CREATE INDEX idx_bookings_check_out ON bookings(check_out);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_rooms_name ON rooms(name);

-- Step 6: Insert predefined rooms
INSERT INTO rooms (name, capacity, type) VALUES
  ('Brishti Bilash', 4, 'Cottage'),
  ('Purnota', 4, 'Cottage'),
  ('Iraboti', 4, 'Semi-Duplex'),
  ('Mayaboti', 4, 'Semi-Duplex'),
  ('Tent', 10, 'Tent');

-- Step 7: Create helper view for bookings with room details
CREATE VIEW bookings_with_rooms AS
SELECT 
  b.id,
  b.guest_name,
  b.room_id,
  r.name as room_name,
  r.type as room_type,
  r.capacity as room_capacity,
  b.check_in,
  b.check_out,
  b.price,
  b.advance,
  b.guest_count,
  b.status,
  b.notes,
  b.created_at,
  b.updated_at
FROM bookings b
INNER JOIN rooms r ON b.room_id = r.id;

-- ========== ROW LEVEL SECURITY (RLS) ==========

-- Step 8: Enable RLS on both tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- ========== ROOMS TABLE POLICIES ==========

-- Policy 8a: Everyone can read rooms (for dropdown selections)
CREATE POLICY "rooms_read_public" ON rooms
  FOR SELECT
  USING (true);

-- Policy 8b: Only authenticated users (admins) can insert rooms
CREATE POLICY "rooms_insert_auth" ON rooms
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy 8c: Only authenticated users (admins) can update rooms
CREATE POLICY "rooms_update_auth" ON rooms
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy 8d: Only authenticated users (admins) can delete rooms
CREATE POLICY "rooms_delete_auth" ON rooms
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
  );

-- ========== BOOKINGS TABLE POLICIES ==========

-- Policy 8e: Authenticated users can read all bookings
CREATE POLICY "bookings_read_auth" ON bookings
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy 8f: Authenticated users can insert bookings
CREATE POLICY "bookings_insert_auth" ON bookings
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy 8g: Authenticated users can update bookings
CREATE POLICY "bookings_update_auth" ON bookings
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy 8h: Authenticated users can delete bookings
CREATE POLICY "bookings_delete_auth" ON bookings
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
  );

-- ========== NOTES ==========
-- - All table IDs are UUID
-- - room_id is a FOREIGN KEY that references rooms(id)
-- - No type casting needed in queries
-- - Status values: 'confirmed', 'pending', 'cancelled', 'completed'
-- - Indexes added for common query patterns
-- - Only authenticated users can modify data (check is_admin in app logic)
-- - Everyone can read rooms (needed for room selection dropdown)
-- - Only authenticated users can read/modify bookings
