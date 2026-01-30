export interface BookingRoom {
  id: string;
  booking_id: string;
  room_id: string;
  room_name?: string; // Populated when joined with rooms table
  check_in_date: string;
  check_out_date: string;
  number_of_nights: number;
  price_per_night: number;
  total_price: number;
  vat: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  booking_no: string;
  room_id?: string; // Deprecated for multi-room bookings, kept for backward compatibility
  check_in: string;
  check_out: string;
  check_in_time: string;
  check_out_time: string;
  price: number;
  advance: number;
  vat_applicable: boolean;
  vat_amount: number;
  checkout_payable: number;
  refund_amount: number;
  pending_amount: number;
  revenue: number;
  custom_refund_amount?: number; // For custom refund negotiations
  remarks?: string;
  notes?: string;
  guest_count?: number;
  num_adults?: number;
  status: "Confirmed" | "Checked-out" | "Cancelled" | "Paid";
  created_at: string;
  updated_at: string;
  total_rooms?: number; // Number of rooms in this booking (1 for single, >1 for multi-room)
  rooms?: BookingRoom[]; // Array of room bookings in multi-room bookings
  booking_rooms?: BookingRoom[]; // Same as rooms, from Supabase query result
}

export interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description?: string;
  amount: number;
  payment_method?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RefundPolicy {
  id: string;
  policy_name: string;
  days_before_checkin?: number; // NULL for custom refund
  refund_percentage?: number; // NULL for custom refund
  description?: string;
  is_custom: boolean; // true if this is a custom refund policy
  created_at: string;
  updated_at: string;
}

export interface RevenueSummary {
  id: string;
  month_year: string;
  total_bookings: number;
  total_revenue: number;
  total_advance: number;
  total_vat: number;
  total_payable: number;
  total_refunds: number;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  type?: string;
  created_at?: string;
}

export interface User {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingBooking?: Booking;
}

export type DateRangeType = 'week' | 'month' | 'custom';