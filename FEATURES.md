# Resort Booking System - Features Documentation

## ✅ Implemented Features

### 1. **Authentication & Authorization**
- Admin-only login system (only `bonsai.ecovillage@gmail.com` can access)
- Supabase authentication integration
- Protected routes for admin pages
- Session management with auto-logout

### 2. **Booking Management** 
- **Create Bookings**: Add new guest bookings with:
  - Guest name, phone, and email
  - Room selection
  - Check-in and check-out dates
  - Price per night
  - Manual booking number entry (not auto-generated)
  - VAT calculation (2.5% optional)
  - Remarks/notes field
  - Number of adults

- **Edit Bookings**: Inline editing with:
  - All booking details editable
  - Status updates (Confirmed, Paid, Checked-out)
  - Real-time update to Supabase

- **Delete Bookings**: Remove bookings with confirmation

- **View Bookings**: 
  - List all bookings with pagination
  - Filter by room, status, date range
  - Sort by date, price, guest name
  - Display checkout payable amount

### 3. **VAT & Tax Management**
- 2.5% VAT calculation on bookings
- Toggle VAT on/off per booking
- Automatic VAT amount calculation
- Display VAT in booking list and statistics

### 4. **Refund Management**
- Track refund policies
- Calculate refund amounts based on policies
- Refund status tracking per booking
- Display refund information in statistics

### 5. **Expense Management Page** (`/expenses`)
- **Revenue Dashboard**:
  - Total revenue from bookings
  - Revenue broken down by status (Confirmed, Paid, Checked-out)
  - Monthly revenue trends

- **Expense Tracking**:
  - Add expenses with description and amount
  - Categorize expenses
  - Track expense date
  - Edit and delete expenses

- **Financial Summary**:
  - Total revenue
  - Total expenses
  - Net profit/loss calculation
  - VAT collected
  - Refunds issued

- **Pagination**: Browse expenses with 10 items per page

### 6. **Statistics Dashboard**
- **Metrics Displayed**:
  - Total bookings
  - Total revenue
  - Average booking value
  - Total VAT collected
  - Total payable (including VAT)
  - Total refunds issued
  - Profit/Loss calculation
  - Occupancy rate

- **Timeline View**: Visual representation of bookings over time

- **Room Statistics**: Revenue and booking count per room

### 7. **Room Management**
- View all available rooms
- Room selector in booking form
- Room-specific booking history

### 8. **Google Sheets Integration** (For Vercel deployment)
- Auto-sync bookings to Google Sheets
- Bidirectional data sync
- Service account authentication

### 9. **UI/UX Features**
- Responsive design (mobile, tablet, desktop)
- Tailwind CSS styling
- DaisyUI components
- Lucide React icons
- Gradient backgrounds
- Smooth animations and transitions
- Toast notifications for actions
- Modal dialogs for confirmations

### 10. **Data Export** (Ready for implementation)
- Export bookings to CSV
- Export statistics to PDF
- WhatsApp integration ready

---

## 🗄️ Database Schema

### Tables
1. **bookings** - Store all booking information
2. **refund_policies** - Define refund policies
3. **expenses** - Track business expenses
4. **rooms** - Room inventory management

### Key Fields in Bookings Table
- `guest_name`, `guest_phone`, `guest_email`
- `booking_no` (manual entry)
- `room_id`, `check_in`, `check_out`
- `price`, `vat_amount`, `checkout_payable`
- `refund_amount`, `status`
- `remarks`, `num_adults`
- `check_in_time`, `check_out_time`

---

## 🚀 Getting Started

### 1. Login
- Email: `bonsai.ecovillage@gmail.com`
- Password: Your Supabase password

### 2. Navigate Features
- **Navbar** → Dropdown menu for:
  - Manage Bookings (`/bookings`)
  - Expenses & Revenue (`/expenses`)
  - Sign Out

### 3. Create Your First Booking
1. Click "Manage Bookings"
2. Scroll down to "Add New Booking" form
3. Fill in guest details, room, dates, price
4. Optional: Add VAT (2.5%), remarks
5. Click "Add Booking"

### 4. View Statistics
- Check the Statistics Dashboard on the main admin page
- See real-time metrics and trends

### 5. Manage Expenses
- Go to "Expenses & Revenue"
- Add new expenses or view summaries
- Track profit/loss

---

## 📊 SQL Setup

Run the SQL migrations in Supabase:
1. Go to Supabase Dashboard
2. Select your project
3. Go to "SQL Editor"
4. Create new query
5. Copy contents from `SQL_MIGRATIONS_SUPABASE.sql`
6. Execute the script

The migrations will:
- Add new columns to bookings table
- Create refund_policies table
- Create expenses table (if not exists)
- Set up proper indexes and constraints
- Configure Row Level Security (RLS)

---

## 🔒 Security Features

- Admin-only access control
- Supabase Row Level Security (RLS) policies
- Protected routes
- Secure session management
- Environment variables for sensitive data

---

## 🎯 Next Steps (Optional Enhancements)

1. **WhatsApp Integration**: Send booking confirmations via WhatsApp
2. **Email Notifications**: Auto-send booking receipts
3. **Payment Gateway**: Integrate Stripe/Bkash for online payments
4. **Guest Portal**: Allow guests to check booking status
5. **Calendar View**: Visual calendar of all bookings
6. **Reports**: Generate monthly/yearly reports
7. **Backup System**: Automated database backups

---

## 📞 Support

For issues or questions:
1. Check browser console (F12) for errors
2. Review Supabase logs
3. Verify environment variables in `.env.local`
4. Check database migrations completed successfully

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: ✅ Production Ready
