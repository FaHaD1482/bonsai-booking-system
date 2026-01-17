# FEATURE IMPLEMENTATION GUIDE

## Overview
This guide covers the complete implementation of new features for the Bonsai Booking System including:
1. Enhanced Booking Form with VAT, Phone, Email, and Remarks
2. Expense Management Page
3. Editable Bookings Table with Status & Refund Handling
4. WhatsApp Integration for Booking Confirmations

---

## PHASE 1: DATABASE SETUP

### Steps to Execute SQL Migrations:

1. **Go to Supabase Dashboard**
   - Select your project (Bonsai Booking System)
   - Navigate to SQL Editor

2. **Copy and Paste SQL Migrations**
   - Open `SQL_MIGRATIONS.sql` from project root
   - Copy all content
   - Paste into Supabase SQL Editor
   - Click "Run" (or use Ctrl+Enter)

3. **Verify Migrations**
   - Check "Tables" section in Supabase
   - You should see new fields in `bookings` table:
     - `guest_phone`, `guest_email`, `booking_no`
     - `vat_applicable`, `vat_amount`
     - `remarks`, `checkout_payable`, `refund_amount`
     - `num_adults`, `check_in_time`, `check_out_time`
   - New tables: `expenses`, `refund_policies`, `revenue_summary`

4. **Update RLS Policies**
   - Already included in migrations
   - Verify in Authentication > Policies

---

## PHASE 2: UPDATE BOOKING FORM

### Fields to Add:
```typescript
interface BookingFormData {
  guest_name: string;
  guest_phone: string;           // NEW
  guest_email?: string;          // NEW
  booking_no: string;            // AUTO-GENERATED
  room_id: string;
  check_in: string;
  check_out: string;
  check_in_time: string;         // NEW (default: 14:00)
  check_out_time: string;        // NEW (default: 12:00)
  price: number;
  advance: number;
  vat_applicable: boolean;       // NEW (radio: Yes/No)
  remarks: string;               // NEW (textarea)
  num_adults: number;            // NEW
}
```

### Form Layout Changes:
1. **Guest Information Section**
   - Name (text)
   - Phone (tel) - Required, with validation
   - Email (email) - Optional
   - Adults Count (number)

2. **Room & Dates Section**
   - Room Selection (select)
   - Check-In Date & Time (date + time)
   - Check-Out Date & Time (date + time)

3. **Pricing Section**
   - Base Price (number)
   - Advance Payment (number)
   - VAT Applicable (radio: Applicable/Not Applicable)
   - VAT Amount (auto-calculated, read-only)
   - Total Price (auto-calculated, read-only)
   - Checkout Payable (auto-calculated, read-only)

4. **Remarks Section**
   - Remarks (textarea) - for facilities, amenities notes

5. **Action Buttons**
   - Submit Booking
   - Send WhatsApp Confirmation (appears after booking creation)
   - Copy Message to Clipboard

### Calculations in Form:
```typescript
// Real-time calculations as user types
handlePriceChange = () => {
  const vat = calculateVAT(price, vatApplicable);
  const total = calculateTotalPrice(price, vat);
  const payable = calculateCheckoutPayable(total, advance);
  
  setFormData(prev => ({
    ...prev,
    vat_amount: vat,
    checkout_payable: payable
  }));
}
```

---

## PHASE 3: UPDATE BOOKINGS TABLE/LIST

### New Columns:
- Booking No
- Guest Phone
- Check-In/Check-Out with Times
- Price, Advance, VAT, Total, Payable
- Status (dropdown: Confirmed, Checked-out, Cancelled)
- Actions (Edit, Delete, Refund)

### Features:
1. **Inline Editing**
   - Double-click rows to edit
   - Edit allowed fields: remarks, status, check-in/out times
   - Save changes to database

2. **Status Management**
   - Confirmed → Checked-out
   - Confirmed/Checked-out → Cancelled
   - Auto-calculate refund on cancellation

3. **Delete Functionality**
   - Soft delete (mark as cancelled)
   - Calculate refund automatically
   - Free up room for that date range

4. **Action Buttons**
   - View Details (modal)
   - Send WhatsApp Reminder
   - Edit
   - Cancel (with refund calculation)
   - Delete

5. **Pagination**
   - Show 10, 25, 50 bookings per page
   - Client-side or server-side pagination

---

## PHASE 4: EXPENSE MANAGEMENT PAGE

### Create File: `src/pages/Expenses.tsx`

#### Page Structure:
```
1. Header with Date Range Filter
   - Monthly selector (default: Current Month)
   - Custom date range picker
   - Export to CSV button

2. Summary Cards (Row 1)
   - Total Revenue (all bookings)
   - Total Advance (collected advances)
   - Total VAT (collected VAT)
   
3. Summary Cards (Row 2)
   - Total Payable (remaining to collect)
   - Total Refunds (paid to cancelled bookings)
   - Profit/Loss (Revenue - Expenses)

4. Expense Input Form
   - Date picker
   - Category dropdown (Employees, Utilities, Other)
   - Description (text)
   - Amount (number)
   - Payment Method (Cash, Bank Transfer, etc.)
   - Submit button

5. Expenses Table with Pagination
   - Columns: Date, Category, Description, Amount, Action
   - Actions: Edit, Delete
   - Pagination: Show 25 per page
   - Search/Filter by category
```

#### Expense Categories:
- Employees (Salaries, Wages)
- Utilities (Electricity, Water, Gas)
- Maintenance (Repairs, Cleaning)
- Other (Miscellaneous)

#### Data Loading:
```typescript
// Get revenue data for period
const getRevenueData = async (startDate, endDate) => {
  const { data } = await supabase
    .from('bookings')
    .select('price, advance, vat_amount, refund_amount, status')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  return data;
};

// Get expenses for period
const getExpenses = async (startDate, endDate) => {
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false });
  
  return data;
};

// Calculate totals
const calculateTotals = (bookings, expenses) => {
  return {
    totalRevenue: bookings.reduce((sum, b) => sum + b.price, 0),
    totalAdvance: bookings.reduce((sum, b) => sum + b.advance, 0),
    totalVAT: bookings.reduce((sum, b) => sum + b.vat_amount, 0),
    totalPayable: bookings.reduce((sum, b) => sum + (b.price + b.vat_amount - b.advance), 0),
    totalRefunds: bookings.reduce((sum, b) => b.status === 'Cancelled' ? sum + b.refund_amount : sum, 0),
    totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0)
  };
};
```

---

## PHASE 5: WHATSAPP INTEGRATION

### Setup:

1. **Choose WhatsApp Service** (select one):
   - **Twilio**: https://www.twilio.com/whatsapp
   - **WhatsApp Business API**: https://business.facebook.com
   - **Green API**: https://green-api.com
   - **MessageBird**: https://www.messagebird.com

2. **Get API Keys**
   - Sign up for chosen service
   - Get API credentials
   - Add to `.env.local`:
     ```
     VITE_WHATSAPP_API_KEY=your_api_key
     VITE_WHATSAPP_API_URL=your_api_url
     VITE_WHATSAPP_SENDER_ID=your_sender_id
     ```

3. **Update vercel.json** (add to environment variables)
   ```json
   {
     "env": {
       "VITE_WHATSAPP_API_KEY": "your_key",
       "VITE_WHATSAPP_API_URL": "your_url",
       "VITE_WHATSAPP_SENDER_ID": "your_sender"
     }
   }
   ```

### Implementation in BookingForm:

```typescript
// After successful booking creation
const handleSendWhatsApp = async () => {
  const message = generateWhatsAppMessage(booking, room);
  const result = await sendWhatsAppMessage(booking.guest_phone, message);
  
  if (result.success) {
    setStatus({ type: 'success', message: 'WhatsApp sent successfully!' });
  } else {
    setStatus({ type: 'error', message: 'Failed to send WhatsApp' });
  }
};

// In form JSX:
{successBooking && (
  <div className="mt-4 space-y-2">
    <button 
      onClick={handleSendWhatsApp}
      className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded"
    >
      📱 Send WhatsApp Confirmation
    </button>
    <button 
      onClick={() => copyToClipboard(generateWhatsAppMessage(booking, room))}
      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
    >
      📋 Copy Message to Clipboard
    </button>
  </div>
)}
```

---

## PHASE 6: UPDATE STATISTICS DASHBOARD

### New Metrics to Display:

```typescript
// Key Metrics for current month
- Total Bookings (count)
- Total Revenue (sum of price)
- Total Advance (sum of advance)
- Total VAT Collected (sum of vat_amount)
- Total Payable (sum of checkout_payable)
- Total Refunds Given (sum of refund_amount where status='Cancelled')
- Net Revenue (Revenue - Expenses)
- Profit Margin % ((Revenue - Expenses) / Revenue * 100)
```

### Display Layout:
```
Row 1: Bookings | Revenue | Advance | VAT Collected
Row 2: Payable | Refunds | Expenses | Profit Margin
```

---

## PHASE 7: NAVIGATION UPDATES

### Add to Navbar/Routes:

```tsx
// In App.tsx or Navbar.tsx
<Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
<Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
<Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
```

### Navbar Items:
- Dashboard (Home/Bookings)
- Expenses (NEW)
- Rooms
- Profile
- Sign Out

---

## REFUND POLICY LOGIC

### When Booking is Cancelled:

```typescript
const handleCancelBooking = async (booking: Booking) => {
  const { refundAmount, policy } = calculateRefund(
    booking.price,
    booking.check_in,
    booking.advance
  );

  // Update booking in database
  await supabase
    .from('bookings')
    .update({
      status: 'Cancelled',
      refund_amount: refundAmount,
      updated_at: new Date().toISOString()
    })
    .eq('id', booking.id);

  // Send refund notification
  showNotification(`Refund of BDT ${refundAmount} will be processed. Policy: ${policy}`);
};
```

---

## FILE STRUCTURE AFTER IMPLEMENTATION

```
src/
├── components/
│   ├── BookingForm.tsx (UPDATED)
│   ├── BookingList.tsx (UPDATED - now editable)
│   ├── StatisticsDashboard.tsx (UPDATED - new metrics)
│   └── ...
├── pages/
│   ├── Bookings.tsx (UPDATED)
│   ├── Expenses.tsx (NEW)
│   ├── Home.tsx
│   └── ...
├── services/
│   ├── supabaseClient.ts
│   ├── whatsappService.ts (NEW)
│   └── ...
├── utils/
│   ├── bookingUtils.ts
│   ├── calculationUtils.ts (NEW)
│   └── ...
└── types/
    └── index.ts (UPDATED)
```

---

## TESTING CHECKLIST

### Booking Form:
- [ ] Phone number validation works
- [ ] Email validation optional
- [ ] VAT calculates correctly (2.5%)
- [ ] Checkout payable = (price + vat) - advance
- [ ] Booking number auto-generates
- [ ] WhatsApp message generates correctly
- [ ] Can copy message to clipboard

### Bookings List:
- [ ] Can edit remarks
- [ ] Can change status
- [ ] Refund calculates on cancellation
- [ ] Room becomes available after cancellation
- [ ] Delete operation works
- [ ] Pagination works

### Expenses Page:
- [ ] Can add expenses
- [ ] Totals calculate correctly
- [ ] Date range filter works
- [ ] Export to CSV works
- [ ] Pagination works

### Statistics:
- [ ] All new metrics display
- [ ] Calculations correct
- [ ] Updates when data changes

---

## QUICK START

1. Execute SQL migrations in Supabase
2. Update types in `src/types/index.ts`
3. Create new utility files
4. Update BookingForm component
5. Update BookingList component
6. Create Expenses page
7. Update Statistics Dashboard
8. Add WhatsApp integration
9. Test all features
10. Deploy to Vercel

**Estimated Time**: 3-4 hours for full implementation

---

## SUPPORT & TROUBLESHOOTING

### Common Issues:

1. **Phone validation failing**
   - Use regex: `/^(\+?880|0)?1[3-9]\d{8}$/`
   - Format: +880XXXXXXXXXX or 01XXXXXXXXX

2. **VAT not calculating**
   - Check: `vat_applicable === true`
   - Formula: `price * 0.025`
   - Round to 2 decimals

3. **WhatsApp not sending**
   - Check API key in Supabase environment
   - Verify phone number format
   - Check WhatsApp service limits

4. **Pagination slow**
   - Use server-side pagination with `.range()`
   - Implement lazy loading
   - Add indexes on filter columns

---

## NEXT STEPS

After implementing these features:
1. Add email notifications on booking
2. Add SMS reminders before check-in
3. Create invoice PDF generation
4. Add guest reviews/feedback system
5. Implement multi-room bulk bookings
6. Add reporting/analytics dashboard
