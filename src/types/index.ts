export interface Booking {
  id: string;
  guest_name: string;
  room_id: string;
  check_in: string;
  check_out: string;
  price: number;
  advance: number;
  guest_count?: number;
  status: "Confirmed" | "Paid" | "Checked-out";
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