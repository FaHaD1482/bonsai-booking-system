# Resort Booking Tracker 🏨

A secure, modern resort booking management system with real-time conflict detection, automatic Google Sheets synchronization, and beautiful Emerald-themed UI.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
[![Supabase](https://img.shields.io/badge/supabase-1.0-brightgreen.svg)](https://supabase.com)
[![React](https://img.shields.io/badge/react-18.2-blue.svg)](https://react.dev)

## ✨ Features

### 🔐 Security
- **Admin-Only Access:** Protected routes restrict access to authorized admins only
- **Email Verification:** Only specific admin email can sign in
- **Secure Authentication:** Powered by Supabase Auth
- **Environment Variables:** Sensitive data kept secure

### 📊 Dashboard
- **Real-time Statistics:**
  - Total Bookings Count
  - Advance Payment Collection
  - Active Room Occupancy
  
- **Timeline View:** Visual representation of room occupancy with guest details
  
- **Advanced Booking Table:**
  - Search by guest name or room number
  - Filter by status (Confirmed, Paid, Checked-out)
  - Update booking status instantly
  - Delete bookings with confirmation
  - Sort by dates

### 🚫 Conflict Detection
Smart booking engine prevents double-booking:
- Checks room availability before confirmation
- Compares dates in real-time
- Shows which guest is blocking the room
- Blocks conflicting bookings automatically

### 🎨 Beautiful UI
- **DaisyUI Theme:** Emerald theme for resort feel
- **Responsive Design:** Works on desktop, tablet, mobile
- **Lucide Icons:** Clean, modern iconography
- **Tailwind CSS:** Utility-first styling
- **Dark Mode Ready:** Built-in theme support

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Vite** | Fast build tool & dev server |
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Utility-first CSS |
| **DaisyUI** | Component library |
| **Supabase** | Database & Authentication |
| **Lucide React** | Icons |
| **Vercel** | Deployment & Serverless Functions |

## 📋 Prerequisites

Before you begin, ensure you have:
- Node.js v16+ ([Download](https://nodejs.org/))
- Git ([Download](https://git-scm.com/))
- A Supabase account ([Sign up free](https://supabase.com))
- A Google Cloud account ([Sign up free](https://cloud.google.com))

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/resort-booking-tracker.git
cd resort-booking-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create `.env.local`

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ADMIN_EMAIL=admin@resort.com
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_JSON=your_service_account_json
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

### 5. Login

Use your admin email and Supabase password to log in.

## 📚 Complete Setup Guide

For step-by-step instructions on:
- Setting up Supabase database
- Configuring Google Cloud & Sheets API
- Deploying to Vercel
- Troubleshooting

**See [SETUP.md](./SETUP.md)** - Complete beginner-friendly guide!

## 📁 Project Structure

```
resort-booking-tracker/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── Navbar.tsx          # Navigation bar
│   │   ├── BookingForm.tsx     # Add new booking
│   │   ├── BookingList.tsx     # View all bookings
│   │   ├── StatisticsDashboard.tsx
│   │   ├── TimelineView.tsx    # Room occupancy visualization
│   │   └── Footer.tsx
│   ├── pages/                   # Page components
│   │   ├── Home.tsx            # Login page
│   │   ├── Bookings.tsx        # Dashboard
│   │   ├── Profile.tsx         # Admin profile
│   │   └── ProtectedRoute.tsx  # Route protection
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts          # Authentication logic
│   │   └── useSyncToSheets.ts  # Sync functionality
│   ├── services/
│   │   └── supabaseClient.ts   # Supabase config
│   ├── utils/
│   │   └── bookingUtils.ts     # Helper functions
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── api/
│   └── sync-to-sheet.ts        # Vercel serverless function
├── public/                      # Static assets
└── [config files]
```