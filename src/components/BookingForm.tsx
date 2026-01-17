import React, { useState, useEffect } from 'react';
import supabase from '../services/supabaseClient';
import { Booking, Room } from '../types';
import { checkRoomConflict, formatDate } from '../utils/bookingUtils';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import RoomSelector from './RoomSelector';

interface BookingFormProps {
  onBookingAdded?: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onBookingAdded }) => {
  const [formData, setFormData] = useState({
    guest_name: '',
    room_id: '',
    check_in: '',
    check_out: '',
    price: '',
    advance: '',
    guest_count: '',
  });

  const [status, setStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    fetchBookings();
    fetchRooms();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .neq('status', 'Checked-out');

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setRooms(data || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Checking availability...' });

    try {
      // Validate required fields
      if (!formData.guest_name || !formData.room_id || !formData.check_in || !formData.check_out || !formData.price || !formData.advance) {
        setStatus({ type: 'error', message: 'Please fill in all fields' });
        return;
      }

      // Validate dates
      const checkIn = new Date(formData.check_in);
      const checkOut = new Date(formData.check_out);
      if (checkIn >= checkOut) {
        setStatus({ type: 'error', message: 'Check-out date must be after check-in date' });
        return;
      }

      console.log('📋 Booking Form: Refreshing bookings for conflict check...');
      
      // REFRESH bookings before checking conflicts (important!)
      const { data: latestBookings, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .neq('status', 'Checked-out');

      if (fetchError) {
        console.error('❌ Failed to fetch bookings:', fetchError);
        throw fetchError;
      }

      console.log('✅ Fetched latest bookings:', latestBookings?.length || 0, 'records');

      // Check for conflicts with latest data
      const newBooking = {
        guest_name: formData.guest_name,
        room_id: formData.room_id, // Now this is a UUID string
        check_in: formatDate(formData.check_in),
        check_out: formatDate(formData.check_out),
        price: parseFloat(formData.price),
        advance: parseFloat(formData.advance),
        status: 'Confirmed' as const,
        guest_count: parseInt(formData.guest_count || '1'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const conflictCheck = checkRoomConflict(newBooking, latestBookings || []);

      if (conflictCheck.hasConflict && conflictCheck.conflictingBooking) {
        const conflicting = conflictCheck.conflictingBooking;
        console.warn('⚠️ Conflict detected:', conflicting);
        setStatus({
          type: 'error',
          message: `Conflict detected! Room ${formData.room_id} is already booked by ${conflicting.guest_name} from ${conflicting.check_in} to ${conflicting.check_out}`,
        });
        return;
      }

      console.log('✅ No conflict detected. Inserting booking...');

      // Insert booking to Supabase
      const { data: insertedData, error } = await supabase
        .from('bookings')
        .insert([newBooking])
        .select();

      if (error) {
        console.error('❌ Insert error:', error);
        throw error;
      }

      console.log('✅ Booking inserted successfully:', insertedData);

      setStatus({
        type: 'success',
        message: 'Booking added successfully!',
      });

      // Reset form
      setFormData({
        guest_name: '',
        room_id: '',
        check_in: '',
        check_out: '',
        price: '',
        advance: '',
        guest_count: '',
      });

      // Refresh bookings list
      await fetchBookings();

      // Call callback if provided
      if (onBookingAdded) {
        onBookingAdded();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add booking';
      setStatus({ type: 'error', message });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {status.message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top duration-300 shadow-lg ${
          status.type === 'error' ? 'bg-red-50 text-red-700 border-2 border-red-200' : 
          status.type === 'success' ? 'bg-green-50 text-green-700 border-2 border-green-200' : 
          'bg-blue-50 text-blue-700 border-2 border-blue-200'
        }`}>
          {status.type === 'error' && <AlertCircle size={20} className="flex-shrink-0" />}
          {status.type === 'success' && <CheckCircle size={20} className="flex-shrink-0" />}
          {status.type === 'loading' && <Loader size={20} className="animate-spin flex-shrink-0" />}
          <span className="font-semibold">{status.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Guest Name *
          </label>
          <input
            type="text"
            name="guest_name"
            value={formData.guest_name}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 transition-all duration-300 hover:border-emerald-300 placeholder-gray-400"
            placeholder="e.g., John Doe"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Room Name *
          </label>
          <RoomSelector
            value={formData.room_id}
            onChange={(roomId) => setFormData((prev) => ({ ...prev, room_id: roomId }))}
            disabled={status.type === 'loading'}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Number of Guests
          </label>
          <input
            type="number"
            name="guest_count"
            value={formData.guest_count}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 transition-all duration-300 hover:border-emerald-300 placeholder-gray-400"
            placeholder="e.g., 2"
            min="1"
            max="10"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Check-in Date *
          </label>
          <input
            type="date"
            name="check_in"
            value={formData.check_in}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 transition-all duration-300 hover:border-emerald-300"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Check-out Date *
          </label>
          <input
            type="date"
            name="check_out"
            value={formData.check_out}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 transition-all duration-300 hover:border-emerald-300"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Total Price (৳) *
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 transition-all duration-300 hover:border-emerald-300 placeholder-gray-400"
            placeholder="e.g., 5000"
            step="0.01"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Advance Amount (৳) *
          </label>
          <input
            type="number"
            name="advance"
            value={formData.advance}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 transition-all duration-300 hover:border-emerald-300 placeholder-gray-400"
            placeholder="e.g., 2000"
            step="0.01"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={status.type === 'loading'}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-xl hover:scale-105 active:scale-95"
      >
        {status.type === 'loading' ? (
          <>
            <Loader size={18} className="animate-spin" />
            Processing...
          </>
        ) : (
          'Add Booking'
        )}
      </button>
    </form>
  );
};

export default BookingForm;