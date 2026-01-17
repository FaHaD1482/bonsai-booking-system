import { Booking, ConflictCheckResult } from '../types';

export const checkRoomConflict = (
  newBooking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>,
  existingBookings: Booking[]
): ConflictCheckResult => {
  const { room_id, check_in, check_out } = newBooking;

  const newCheckIn = new Date(check_in).getTime();
  const newCheckOut = new Date(check_out).getTime();

  for (const booking of existingBookings) {
    // Skip if booking is already checked out or in a final status
    if (booking.status === 'Checked-out') {
      continue;
    }

    if (booking.room_id === room_id) {
      const existingCheckIn = new Date(booking.check_in).getTime();
      const existingCheckOut = new Date(booking.check_out).getTime();

      // Conflict detection logic:
      // (room_id == new_room) AND (new_check_in < existing_check_out) AND (new_check_out > existing_check_in)
      if (newCheckIn < existingCheckOut && newCheckOut > existingCheckIn) {
        return {
          hasConflict: true,
          conflictingBooking: booking,
        };
      }
    }
  }

  return { hasConflict: false };
};

export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export const formatDateDisplay = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const calculateNights = (checkIn: string, checkOut: string): number => {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
};
