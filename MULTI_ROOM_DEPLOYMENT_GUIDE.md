# Multi-Room Booking System - Integration & Deployment Guide

## Step 1: Database Migration

Run the migration to create the new `booking_rooms` junction table:

```sql
-- File: migrations/002_add_booking_rooms_junction_table.sql
```

**Via Supabase Dashboard**:
1. Go to SQL Editor in Supabase
2. Create new query
3. Copy-paste contents of `002_add_booking_rooms_junction_table.sql`
4. Execute the query

**Or via CLI**:
```bash
supabase migration up
```

This migration:
- Creates `booking_rooms` table with all necessary fields
- Adds indexes for performance
- Makes `room_id` nullable in `bookings` table
- Adds `total_rooms` field to track room count

## Step 2: Deploy Code Changes

All TypeScript/React code has been updated and compiled successfully:

**Modified Files**:
- `src/types/index.ts` - Type definitions
- `src/utils/bookingUtils.ts` - Conflict detection
- `src/utils/calculationUtils.ts` - Price calculations
- `src/components/BookingForm.tsx` - Main booking form
- `src/components/BookingList.tsx` - Booking display
- `src/components/StatisticsDashboard.tsx` - Stats calculations
- `src/services/whatsappService.ts` - Notifications

**Deployment**:
```bash
npm run build
# Then deploy to Vercel or your hosting provider
```

## Step 3: Test the Features

### Test 1: Single-Room Booking (Backward Compatibility)
1. Go to Bookings page
2. Select "Single Room" booking type
3. Fill form as before
4. Verify booking creates successfully
5. Check that `room_id` in database is populated, `booking_rooms` is empty

### Test 2: Multi-Room Booking
1. Go to Bookings page
2. Select "Multiple Rooms" booking type
3. Set overall check-in: Feb 1, 2026
4. Set overall check-out: Feb 3, 2026
5. Add first room:
   - Room: Room A
   - Check-in: Feb 1
   - Check-out: Feb 2
   - Price/Night: 5000
6. Add second room:
   - Room: Room B
   - Check-in: Feb 2
   - Check-out: Feb 3
   - Price/Night: 5500
7. Fill guest info
8. Set VAT applicable: Yes
9. Verify total = 10500 + VAT
10. Submit and verify:
    - Single booking record created with `room_id = null`
    - Two rows in `booking_rooms` table created
    - `total_rooms = 2`

### Test 3: Conflict Detection
1. Create a booking: Room A, Feb 1-3
2. Try to create overlapping single-room booking: Room A, Feb 2-4
   - Should show conflict error ✓
3. Try to create non-conflicting multi-room: Room B, Feb 1-3
   - Should succeed ✓
4. Try to create conflicting multi-room: Room A (Feb 1-2) + Room A (Feb 2-3)
   - Second room should show conflict if already booked ✓

### Test 4: Pricing Calculation
1. Multi-room with:
   - Room A: Feb 1-2 (1 night × 5000 = 5000)
   - Room B: Feb 2-3 (1 night × 5500 = 5500)
   - Total: 10500
   - VAT: 10500 × 2.5% = 263 → rounds to 263
   - Final Total: 10763 ✓

### Test 5: WhatsApp Message
1. Create multi-room booking
2. Click "Copy Message to Clipboard"
3. Verify message contains:
   - All room names
   - Individual dates for each room
   - Individual night counts
   - Individual prices
   - Total calculated correctly

### Test 6: Booking List Display
1. Create multi-room booking
2. Go to Bookings page
3. Verify booking displays:
   - "Room A, Room B" in room column
   - Overall dates
   - Correct pricing
4. Delete the booking - verify cascade delete works

### Test 7: Statistics
1. Create multi-room booking with overlapping dates
2. Go to Statistics page
3. Verify "Active Rooms" count includes all rooms from multi-room booking
4. No double-counting occurs

## Step 4: Migration from Single-Room to Multi-Room

**For Existing Bookings**:
- All existing single-room bookings will continue to work
- The `room_id` field will be populated for single-room bookings
- No migration script needed - backward compatible

**Creating First Multi-Room Booking**:
1. Guest wants to book: Feb 1-3, Room A (Feb 1-2) + Room B (Feb 2-3)
2. Use new multi-room form
3. System creates:
   - One booking record with `room_id = null`, `total_rooms = 2`
   - Two booking_rooms records with individual dates/prices

## Step 5: Monitoring & Maintenance

### Check Multi-Room Bookings
```sql
-- View all multi-room bookings
SELECT b.*, COUNT(br.id) as room_count
FROM bookings b
LEFT JOIN booking_rooms br ON b.id = br.booking_id
WHERE b.room_id IS NULL OR COUNT(br.id) > 0
GROUP BY b.id
HAVING COUNT(br.id) > 0;

-- View booking with all its rooms
SELECT b.booking_no, b.guest_name, br.room_id, br.check_in_date, br.check_out_date
FROM bookings b
JOIN booking_rooms br ON b.id = br.booking_id
WHERE b.booking_no = 'BK202602001'
ORDER BY br.check_in_date;
```

### Performance
- Indexes created on `booking_rooms(booking_id)`, `booking_rooms(room_id)`, `booking_rooms(check_in_date, check_out_date)`
- Conflict detection uses indexed queries
- Performance similar to single-room bookings

## Step 6: Troubleshooting

### Issue: "Booking inserted but rooms not saved"
- Check if `booking_rooms` insert is failing
- Verify booking_rooms table exists and has correct schema
- Check Supabase logs for errors

### Issue: "Conflict detection not working"
- Verify `checkMultiRoomConflict()` is being called (not `checkRoomConflict()`)
- Check if `booking_rooms` data is being fetched in conflict check
- Test with simple case first

### Issue: "Multi-room bookings showing incorrectly"
- Verify `booking_rooms` is being fetched in BookingList
- Check if room names are being populated correctly
- Ensure SQL joins are correct

### Issue: "WhatsApp message not showing all rooms"
- Verify `booking.rooms` array is populated
- Check that rooms parameter passed to generateWhatsAppMessage
- Test with simple 2-room booking first

## Step 7: Rollback Plan (if needed)

If issues occur and you need to rollback:

```sql
-- Keep single-room bookings as-is (they work fine)
-- Delete multi-room bookings data if corrupted
DELETE FROM booking_rooms WHERE booking_id IN (SELECT id FROM bookings WHERE room_id IS NULL);

-- Keep the migration - it's backward compatible
-- Just disable multi-room UI by removing toggle from BookingForm
```

## Key Points to Remember

✅ **Single-room bookings unchanged** - backward compatible
✅ **Individual room rates** - each room has own price
✅ **Consecutive bookings allowed** - Feb 1-2 Room A, Feb 2-3 Room B for same guest
✅ **Conflict detection smart** - validates each room independently
✅ **All processes updated** - pricing, whatsapp, stats, display all support multi-room
✅ **Database transaction safe** - both inserts happen together or both fail

## Support

For issues or questions:
1. Check MULTI_ROOM_BOOKING_IMPLEMENTATION.md for detailed specs
2. Review test cases above
3. Check database schema in migrations/002_add_booking_rooms_junction_table.sql
4. Verify all files compiled without errors
