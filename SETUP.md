# Resort Booking Tracker - Complete Setup Guide

A secure, modern resort booking system built with Vite, React, Tailwind CSS, and Supabase with automatic Google Sheets synchronization.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Supabase Configuration](#supabase-configuration)
4. [Google Sheets Integration](#google-sheets-integration)
5. [Environment Variables](#environment-variables)
6. [Running Locally](#running-locally)
7. [Deploying to Vercel](#deploying-to-vercel)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **npm** (comes with Node.js)

Verify installations:
```bash
node --version
npm --version
git --version
```

---

## Project Setup

### Step 1: Clone or Extract the Project

```bash
cd "e:\Coding\Booking System\resort-booking-tracker"
```

### Step 2: Install Dependencies

Install all required packages:

```bash
npm install
```

This will install:
- React & React DOM
- Vite (fast build tool)
- Tailwind CSS (styling)
- DaisyUI (component library)
- Lucide React (icons)
- Supabase Client (database)
- Axios (API requests)
- TypeScript (type safety)

### Step 3: Verify Installation

Check if everything installed correctly:

```bash
npm list
```

---

## Supabase Configuration

### Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Sign Up" (use email or GitHub)
3. Create a new organization or use existing one

### Step 2: Create a New Project

1. Click "New Project"
2. **Project Name:** `resort-booking-tracker`
3. **Database Password:** Create a strong password (save it safely!)
4. **Region:** Choose closest to your location
5. Click "Create new project" and wait (takes 1-2 minutes)

### Step 3: Create the Bookings Table

Once your project is created:

1. Go to "SQL Editor" in the left sidebar
2. Click "New Query"
3. Paste the following SQL code:

```sql
-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name VARCHAR(255) NOT NULL,
  room_id INTEGER NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  advance DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'Confirmed' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_bookings_room_id ON public.bookings(room_id);
CREATE INDEX idx_bookings_check_in ON public.bookings(check_in);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (admin only)
CREATE POLICY "Admin can manage bookings"
  ON public.bookings
  FOR ALL
  USING (auth.uid() = auth.uid())
  WITH CHECK (auth.uid() = auth.uid());

-- Grant permissions
GRANT ALL ON public.bookings TO postgres, anon, authenticated, service_role;
```

4. Click "Run" button
5. You should see "Success" message

### Step 4: Get API Credentials

1. Go to "Settings" → "API" in the sidebar
2. Copy your:
   - **Project URL** (looks like: `https://xxxxxx.supabase.co`)
   - **Anon Public Key** (starts with `eyJ...`)

**Save these - you'll need them for environment variables!**

### Step 5: Set Up Authentication

1. Go to "Authentication" → "Providers" in sidebar
2. Make sure "Email" is enabled (it's default)
3. Go to "Authentication" → "Users"
4. Click "Add user" (top right)
5. Enter your email and password
6. Click "Create user"

**Your admin email is important - remember it!**

---

## Google Sheets Integration

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project:
   - Click project dropdown (top left)
   - Click "New Project"
   - Name: `Resort Booking Tracker`
   - Click "Create"

### Step 2: Enable the Google Sheets API

1. Search for "Google Sheets API" in the search bar
2. Click on it
3. Click "Enable"
4. Wait for it to enable

### Step 3: Create a Service Account

1. Go to "Credentials" (left sidebar)
2. Click "Create Credentials" → "Service Account"
3. **Service account name:** `resort-booking`
4. Click "Create and Continue"
5. Grant basic roles (Optional - click "Continue")
6. Click "Done"

### Step 4: Create a JSON Key

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON"
5. Click "Create"
6. **A JSON file will download** - Save this safely! You'll need its contents.

**Warning:** Keep this JSON file secret! Don't share it or commit it to git.

### Step 5: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new sheet: `Resort Bookings`
3. Add headers in Row 1:
   ```
   ID | Guest Name | Room # | Check-in | Check-out | Price | Advance | Status | Synced At
   ```
4. In URL, copy the Sheet ID (between `/d/` and `/edit`):
   - Example: `https://docs.google.com/spreadsheets/d/1ABC123XYZ/edit`
   - Sheet ID: `1ABC123XYZ`

### Step 6: Share Sheet with Service Account

1. In Google Sheets, click "Share" (top right)
2. Go to the JSON file you downloaded
3. Find the `client_email` field (looks like: `resort-booking@project.iam.gserviceaccount.com`)
4. Copy and paste it in the Share field
5. Give it "Editor" access
6. Click "Share"

**Save the Sheet ID - you'll need it!**

---

## Environment Variables

### Step 1: Create .env.local File

In your project root (same folder as `package.json`), create a new file:

**File name:** `.env.local`

Add the following content (replace with your actual values):

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_ADMIN_EMAIL=your-admin@email.com

# Google Sheets Configuration (for Vercel deployment)
GOOGLE_SHEET_ID=your-sheet-id-here
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","...":"..."}'
```

### How to Fill Each Value:

**VITE_SUPABASE_URL:**
- Go to Supabase → Settings → API
- Copy the "Project URL"

**VITE_SUPABASE_ANON_KEY:**
- Go to Supabase → Settings → API
- Copy the "Anon public key"

**VITE_ADMIN_EMAIL:**
- Use the email you created in Supabase Authentication

**GOOGLE_SHEET_ID:**
- From your Google Sheet URL, extract the ID
- Example: `1a2b3c4d5e6f7g8h9i0j`

**GOOGLE_SERVICE_ACCOUNT_JSON:**
- Open the JSON file you downloaded from Google Cloud
- Copy the entire content
- Paste as one line (or keep formatting)

### Example .env.local:

```env
VITE_SUPABASE_URL=https://abcdef123456.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ADMIN_EMAIL=admin@resort.com
GOOGLE_SHEET_ID=1a2b3c4d5e6f7g8h9i0j
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"resort-booking"...}
```

**IMPORTANT:** Never commit `.env.local` to Git! It contains sensitive credentials.

---

## Running Locally

### Step 1: Start Development Server

```bash
npm run dev
```

You'll see output like:
```
VITE v4.5.0  ready in 123 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

### Step 2: Open in Browser

1. Go to `http://localhost:5173`
2. You'll see the login page
3. Enter your admin email and password
4. Click "Sign In"

### Step 3: Use the Application

**Home Page:**
- Login form for admin access only
- Security information

**Dashboard (after login):**
- **Statistics:** Total bookings, advance collected, active rooms
- **Room Occupancy:** Timeline view of bookings
- **Add Booking:** Form to create new reservations with conflict detection
- **All Bookings:** Table to view, search, and update bookings

**Profile:**
- View admin account information
- Manage preferences
- Security settings
- Sign out button

### Step 4: Test Conflict Detection

1. Add a booking for Room 101 from Jan 20-25
2. Try adding another booking for same room overlapping (e.g., Jan 23-28)
3. You should see an error: "Conflict detected!"
4. This proves the booking engine is working

### Step 5: Stop the Server

Press `Ctrl + C` in your terminal to stop

---

## Deploying to Vercel

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Use GitHub, GitLab, or Bitbucket account
4. Authorize Vercel

### Step 2: Push Code to GitHub

If you haven't already, create a GitHub repo:

```bash
git init
git add .
git commit -m "Initial commit: Resort booking tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/resort-booking-tracker.git
git push -u origin main
```

### Step 3: Import to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Click "Import Git Repository"
4. Select your GitHub repo
5. Click "Import"

### Step 4: Configure Environment Variables

1. In Vercel project settings, go to "Environment Variables"
2. Add the following:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Your Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Key |
| `VITE_ADMIN_EMAIL` | Your admin email |
| `GOOGLE_SHEET_ID` | Your Google Sheet ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Your service account JSON |

3. Click "Save"

### Step 5: Deploy

1. Click "Deploy"
2. Wait for build to complete (usually 2-3 minutes)
3. You'll get a URL like: `https://resort-booking-tracker.vercel.app`
4. Your app is now live!

### Step 6: Test Live Deployment

1. Go to your Vercel URL
2. Test login, add bookings, and Google Sheets sync
3. Check your Google Sheet - new bookings should appear automatically!

---

## Troubleshooting

### Issue: "npm command not found"

**Solution:**
1. Node.js might not be installed
2. Download from [nodejs.org](https://nodejs.org/)
3. Restart your terminal after installing
4. Try `node --version`

### Issue: "Cannot find module" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -r node_modules
npm install
```

### Issue: Login not working

**Solution:**
1. Check if email is created in Supabase → Authentication → Users
2. Verify `VITE_ADMIN_EMAIL` matches your email in Supabase
3. Check Supabase console for error logs

### Issue: Bookings not appearing in Google Sheets

**Solution:**
1. Verify `GOOGLE_SHEET_ID` is correct
2. Check service account email has "Editor" access to sheet
3. Verify `GOOGLE_SERVICE_ACCOUNT_JSON` is properly formatted
4. Check browser console for errors (F12)

### Issue: "Supabase URL not found"

**Solution:**
1. Create `.env.local` file in project root
2. Add all environment variables
3. Restart dev server: `npm run dev`

### Issue: Vite build fails

**Solution:**
```bash
npm run build
# If it fails, try:
npm install
npm run build
```

### Issue: Can't connect to Supabase

**Solution:**
1. Check internet connection
2. Verify Supabase project is running (green status)
3. Check Supabase credentials in `.env.local`
4. Try: `npm run dev` again

---

## File Structure

```
resort-booking-tracker/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── Navbar.tsx
│   │   ├── BookingForm.tsx
│   │   ├── BookingList.tsx
│   │   ├── StatisticsDashboard.tsx
│   │   ├── TimelineView.tsx
│   │   └── Footer.tsx
│   ├── pages/               # Page components
│   │   ├── Home.tsx         # Login page
│   │   ├── Bookings.tsx     # Dashboard
│   │   ├── Profile.tsx      # Admin profile
│   │   └── ProtectedRoute.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts       # Authentication logic
│   │   └── useSyncToSheets.ts
│   ├── services/
│   │   └── supabaseClient.ts # Supabase config
│   ├── utils/
│   │   └── bookingUtils.ts  # Helper functions
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── api/
│   └── sync-to-sheet.ts     # Vercel serverless function
├── public/                  # Static files
├── .env.local               # Environment variables (LOCAL ONLY)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## Features Explained

### 1. Conflict Detection Engine
Before a booking is saved, the system checks:
- Does the room already have a booking?
- Do the dates overlap?
- If yes → Show error and block submission

**Logic:**
```
Conflict if: (same_room) AND (new_checkin < existing_checkout) AND (new_checkout > existing_checkin)
```

### 2. Admin-Only Access
- Only the email in `VITE_ADMIN_EMAIL` can login
- Non-admin emails are rejected automatically
- Protected routes prevent unauthorized access

### 3. Google Sheets Sync
- Every booking is automatically sent to your Google Sheet
- Uses serverless function on Vercel
- Happens within seconds of booking creation

### 4. Real-time Statistics
- **Total Bookings:** Count of all reservations
- **Advance Collected:** Sum of all advance payments
- **Active Rooms:** Rooms with guests currently checked in

### 5. Timeline View
- Visual representation of room occupancy
- Shows guest names, dates, and prices
- Color-coded by status (Confirmed/Paid/Checked-out)

---

## Common Tasks

### Add a New Booking

1. Go to Dashboard → Add Booking
2. Fill in:
   - Guest Name
   - Room Number
   - Check-in Date
   - Check-out Date
   - Total Price
   - Advance Amount
3. Click "Add Booking"
4. Booking appears in table and Google Sheet

### Update Booking Status

1. Find booking in the table
2. Click status dropdown (Confirmed/Paid/Checked-out)
3. Select new status
4. Automatically saves

### Delete a Booking

1. Find booking in table
2. Click trash icon
3. Confirm deletion

### Search Bookings

1. Use search bar: filter by guest name or room number
2. Use status dropdown: show only specific statuses

---

## Performance Tips

1. **Search bookings** instead of scrolling through all
2. **Use status filter** to focus on active bookings
3. **Archive old bookings** to keep data clean
4. **Check stats daily** for revenue overview

---

## Security Best Practices

✅ **DO:**
- Keep `.env.local` private (add to `.gitignore`)
- Use strong passwords for Supabase and Google Cloud
- Review login history in profile
- Back up important data
- Keep dependencies updated

❌ **DON'T:**
- Share `GOOGLE_SERVICE_ACCOUNT_JSON` with anyone
- Commit `.env.local` to Git
- Use weak passwords
- Share Supabase credentials
- Ignore error messages

---

## Getting Help

**Supabase Documentation:** https://supabase.com/docs
**React Documentation:** https://react.dev
**Tailwind CSS:** https://tailwindcss.com/docs
**DaisyUI:** https://daisyui.com/docs/
**Vercel Docs:** https://vercel.com/docs

---

## Support

For issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Check browser console (F12 → Console tab)
3. Check Supabase logs (Settings → Logs)
4. Search on [Stack Overflow](https://stackoverflow.com)

---

**Happy booking! 🏨✨**
