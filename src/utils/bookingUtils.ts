import { Booking, BookingRoom, ConflictCheckResult } from '../types';

interface RoomDateRange {
  room_id: string;
  check_in: string;
  check_out: string;
}

/**
 * Check if a single room booking conflicts with existing bookings.
 * Checks against both single-room bookings (room_id field) and multi-room bookings (booking_rooms array).
 * Used for backward compatibility with single-room bookings.
 */
export const checkRoomConflict = (
  newBooking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>,
  existingBookings: Booking[]
): ConflictCheckResult => {
  const { room_id, check_in, check_out } = newBooking;

  if (!room_id) {
    return { hasConflict: false };
  }

  const newCheckIn = new Date(check_in).getTime();
  const newCheckOut = new Date(check_out).getTime();

  for (const booking of existingBookings) {
    // Skip if booking is cancelled or already checked out - they don't block availability
    if (booking.status === 'Checked-out' || booking.status === 'Cancelled') {
      continue;
    }

    // Check single-room bookings (room_id field)
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

    // Check multi-room bookings (booking_rooms array)
    if (booking.booking_rooms && booking.booking_rooms.length > 0) {
      for (const bookingRoom of booking.booking_rooms) {
        if (bookingRoom.room_id === room_id) {
          const existingCheckIn = new Date(bookingRoom.check_in_date).getTime();
          const existingCheckOut = new Date(bookingRoom.check_out_date).getTime();

          if (newCheckIn < existingCheckOut && newCheckOut > existingCheckIn) {
            return {
              hasConflict: true,
              conflictingBooking: booking,
            };
          }
        }
      }
    }
  }

  return { hasConflict: false };
};

/**
 * Check if multiple rooms (multi-room booking) conflict with existing bookings.
 * Validates that ALL selected rooms are available for their respective date ranges.
 * Allows consecutive bookings (same guest can book Room A on Feb 1-2 and Room B on Feb 2-3).
 */
export const checkMultiRoomConflict = (
  roomDateRanges: RoomDateRange[],
  existingBookings: Booking[]
): ConflictCheckResult => {
  // For each room-date combination, check conflicts with existing bookings
  for (const { room_id, check_in, check_out } of roomDateRanges) {
    const newCheckIn = new Date(check_in).getTime();
    const newCheckOut = new Date(check_out).getTime();

    for (const booking of existingBookings) {
      // Skip if booking is cancelled or already checked out
      if (booking.status === 'Checked-out' || booking.status === 'Cancelled') {
        continue;
      }

      // Check single-room bookings (backward compatibility)
      if (booking.room_id === room_id) {
        const existingCheckIn = new Date(booking.check_in).getTime();
        const existingCheckOut = new Date(booking.check_out).getTime();

        if (newCheckIn < existingCheckOut && newCheckOut > existingCheckIn) {
          return {
            hasConflict: true,
            conflictingBooking: booking,
          };
        }
      }

      // Check multi-room bookings from booking_rooms table
      if (booking.booking_rooms && booking.booking_rooms.length > 0) {
        for (const bookingRoom of booking.booking_rooms) {
          if (bookingRoom.room_id === room_id) {
            const existingCheckIn = new Date(bookingRoom.check_in_date).getTime();
            const existingCheckOut = new Date(bookingRoom.check_out_date).getTime();

            if (newCheckIn < existingCheckOut && newCheckOut > existingCheckIn) {
              return {
                hasConflict: true,
                conflictingBooking: booking,
              };
            }
          }
        }
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
