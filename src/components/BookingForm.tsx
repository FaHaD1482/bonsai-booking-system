import React, { useState, useEffect } from 'react';
import supabase from '../services/supabaseClient';
import { Booking, Room } from '../types';
import { checkRoomConflict, formatDate } from '../utils/bookingUtils';
import { calculateVAT, calculateTotalPrice, calculateCheckoutPayable, validatePhoneNumber, formatPhoneNumber, validateEmail } from '../utils/calculationUtils';
import { generateWhatsAppMessage, sendWhatsAppMessage, copyToClipboard } from '../services/whatsappService';
import { Loader, MessageCircle, Copy } from 'lucide-react';
import RoomSelector from './RoomSelector';
import { useModal } from '../hooks/useModal';

interface BookingFormProps {
  onBookingAdded?: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onBookingAdded }) => {
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    booking_no: '',
    room_id: '',
    check_in: '',
    check_out: '',
    check_in_time: '14:00',
    check_out_time: '12:00',
    price: '',
    advance: '',
    vat_applicable: false,
    vat_adjustment: '',
    remarks: '',
    num_adults: '1',
  });

  const [calculatedValues, setCalculatedValues] = useState({
    vat_amount: 0,
    total_price: 0,
    checkout_payable: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const { showAlert } = useModal();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    fetchBookings();
    fetchRooms();
  }, []);

  // Recalculate VAT and totals when price or VAT selection changes
  useEffect(() => {
    const price = parseFloat(formData.price) || 0;
    const vat = Math.ceil(calculateVAT(price, formData.vat_applicable));
    const adjustment = parseFloat(formData.vat_adjustment) || 0;
    const adjustedVAT = vat + adjustment;
    const total = calculateTotalPrice(price, adjustedVAT);
    const advance = parseFloat(formData.advance) || 0;
    const payable = calculateCheckoutPayable(total, advance);

    setCalculatedValues({
      vat_amount: adjustedVAT,
      total_price: total,
      checkout_payable: payable,
    });
  }, [formData.price, formData.vat_applicable, formData.vat_adjustment, formData.advance]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .neq('status', 'Checked-out')
        .neq('status', 'Cancelled');

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.guest_name.trim()) errors.guest_name = 'Guest name is required';
    if (!formData.guest_phone.trim()) errors.guest_phone = 'Phone number is required';
    if (formData.guest_phone && !validatePhoneNumber(formData.guest_phone)) {
      errors.guest_phone = 'Invalid phone number format';
    }
    if (formData.guest_email && !validateEmail(formData.guest_email)) {
      errors.guest_email = 'Invalid email format';
    }
    if (!formData.booking_no.trim()) errors.booking_no = 'Booking number is required';
    if (!formData.room_id) errors.room_id = 'Room selection is required';
    if (!formData.check_in) errors.check_in = 'Check-in date is required';
    if (!formData.check_out) errors.check_out = 'Check-out date is required';
    if (new Date(formData.check_in) >= new Date(formData.check_out)) {
      errors.check_out = 'Check-out must be after check-in';
    }
    if (!formData.price) errors.price = 'Price is required';
    if (!formData.advance) errors.advance = 'Advance amount is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showAlert('Validation Error', 'Please fix the errors above', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // Validate dates
      const checkIn = new Date(formData.check_in);
      const checkOut = new Date(formData.check_out);
      if (checkIn >= checkOut) {
        showAlert('Invalid Dates', 'Check-out date must be after check-in date', 'error');
        setIsLoading(false);
        return;
      }

      // Refresh bookings before checking conflicts
      const { data: latestBookings, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .neq('status', 'Checked-out');

      if (fetchError) throw fetchError;

      // Check for conflicts
      const newBooking = {
        guest_name: formData.guest_name,
        guest_phone: formatPhoneNumber(formData.guest_phone),
        guest_email: formData.guest_email || null,
        booking_no: formData.booking_no,
        room_id: formData.room_id,
        check_in: formatDate(formData.check_in),
        check_out: formatDate(formData.check_out),
        check_in_time: formData.check_in_time,
        check_out_time: formData.check_out_time,
        price: parseFloat(formData.price),
        advance: parseFloat(formData.advance),
        vat_applicable: formData.vat_applicable,
        vat_amount: calculatedValues.vat_amount,
        checkout_payable: calculatedValues.checkout_payable,
        remarks: formData.remarks || null,
        num_adults: parseInt(formData.num_adults) || 1,
        status: 'Confirmed' as const,
        guest_count: parseInt(formData.num_adults) || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        revenue: parseFloat(formData.advance),
        pending_amount: parseFloat(formData.price) - parseFloat(formData.advance),
      };

      const conflictCheck = checkRoomConflict(newBooking, latestBookings || []);

      if (conflictCheck.hasConflict && conflictCheck.conflictingBooking) {
        const conflicting = conflictCheck.conflictingBooking;
        showAlert(
          'Room Conflict',
          `Room is already booked by ${conflicting.guest_name}\nFrom: ${conflicting.check_in}\nTo: ${conflicting.check_out}`,
          'error'
        );
        setIsLoading(false);
        return;
      }

      // Insert booking
      const { data: insertedData, error } = await supabase
        .from('bookings')
        .insert([newBooking])
        .select();

      if (error) throw error;

      const createdBooking = insertedData?.[0];
      setSuccessBooking(createdBooking);

      showAlert(
        'Booking Successful',
        `${formData.guest_name} has been booked successfully!\n\nBooking No: ${formData.booking_no}\nAdvance: ৳${formData.advance}`,
        'success'
      );

      // Reset form
      setFormData({
        guest_name: '',
        guest_phone: '',
        guest_email: '',
        booking_no: '',
        room_id: '',
        check_in: '',
        check_out: '',
        check_in_time: '14:00',
        check_out_time: '12:00',
        price: '',
        advance: '',
        vat_applicable: false,
        vat_adjustment: '',
        remarks: '',
        num_adults: '1',
      });

      await fetchBookings();

      if (onBookingAdded) {
        onBookingAdded();
      }

      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add booking';
      showAlert('Booking Error', message, 'error');
      setIsLoading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!successBooking) return;

    const room = rooms.find((r) => r.id === successBooking.room_id);
    if (!room) {
      showAlert('Error', 'Room not found', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const message = generateWhatsAppMessage(successBooking, room);
      const result = await sendWhatsAppMessage(successBooking.guest_phone, message);

      if (result.success) {
        showAlert('WhatsApp', result.message, 'success');
      } else {
        showAlert('WhatsApp Error', result.message, 'error');
      }
      setIsLoading(false);
    } catch (err) {
      showAlert('WhatsApp Error', 'Failed to send WhatsApp message', 'error');
      setIsLoading(false);
    }
  };

  const handleCopyMessage = () => {
    if (!successBooking) return;

    const room = rooms.find((r) => r.id === successBooking.room_id);
    if (!room) return;

    const message = generateWhatsAppMessage(successBooking, room);
    if (copyToClipboard(message)) {
      showAlert('Copied', 'Message copied to clipboard!', 'success');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Guest Information Section */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
        <h3 className="text-lg font-bold text-emerald-900 mb-4">👤 Guest Information</h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Guest Name * {formErrors.guest_name && <span className="text-red-500 text-xs">{formErrors.guest_name}</span>}
            </label>
            <input
              type="text"
              name="guest_name"
              value={formData.guest_name}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                formErrors.guest_name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
              placeholder="e.g., John Doe"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number * {formErrors.guest_phone && <span className="text-red-500 text-xs">{formErrors.guest_phone}</span>}
              </label>
              <input
                type="tel"
                name="guest_phone"
                value={formData.guest_phone}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                  formErrors.guest_phone ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200'
                }`}
                placeholder="e.g., +8801XX XXXXXX"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email {formErrors.guest_email && <span className="text-red-500 text-xs">{formErrors.guest_email}</span>}
              </label>
              <input
                type="email"
                name="guest_email"
                value={formData.guest_email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                  formErrors.guest_email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200'
                }`}
                placeholder="e.g., guest@email.com (Optional)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Booking Number * {formErrors.booking_no && <span className="text-red-500 text-xs">{formErrors.booking_no}</span>}
            </label>
            <input
              type="text"
              name="booking_no"
              value={formData.booking_no}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                formErrors.booking_no ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
              placeholder="e.g., BK202601001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Number of Adults *
            </label>
            <input
              type="number"
              name="num_adults"
              value={formData.num_adults}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 transition-all"
              placeholder="e.g., 2"
              min="1"
              max="20"
            />
          </div>
        </div>
      </div>

      {/* Room & Dates Section */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-bold text-blue-900 mb-4">🏠 Room & Dates</h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Room * {formErrors.room_id && <span className="text-red-500 text-xs">{formErrors.room_id}</span>}
            </label>
            <RoomSelector
              value={formData.room_id}
              onChange={(roomId) => {
                setFormData((prev) => ({ ...prev, room_id: roomId }));
                const room = rooms.find((r) => r.id === roomId);
                setSelectedRoom(room || null);
              }}
              disabled={status.type === 'loading'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Check-in Date * {formErrors.check_in && <span className="text-red-500 text-xs">{formErrors.check_in}</span>}
              </label>
              <input
                type="date"
                name="check_in"
                value={formData.check_in}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                  formErrors.check_in ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Check-in Time
              </label>
              <input
                type="time"
                name="check_in_time"
                value={formData.check_in_time}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Check-out Date * {formErrors.check_out && <span className="text-red-500 text-xs">{formErrors.check_out}</span>}
              </label>
              <input
                type="date"
                name="check_out"
                value={formData.check_out}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                  formErrors.check_out ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Check-out Time
              </label>
              <input
                type="time"
                name="check_out_time"
                value={formData.check_out_time}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
        <h3 className="text-lg font-bold text-orange-900 mb-4">💰 Pricing Details</h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Base Price (৳) * {formErrors.price && <span className="text-red-500 text-xs">{formErrors.price}</span>}
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                  formErrors.price ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-orange-500 focus:ring-orange-200'
                }`}
                placeholder="e.g., 5000"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Advance (৳) * {formErrors.advance && <span className="text-red-500 text-xs">{formErrors.advance}</span>}
              </label>
              <input
                type="number"
                name="advance"
                value={formData.advance}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                  formErrors.advance ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-orange-500 focus:ring-orange-200'
                }`}
                placeholder="e.g., 2000"
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 border-2 border-orange-300 rounded-lg hover:bg-orange-50 cursor-pointer">
              <input
                type="checkbox"
                name="vat_applicable"
                checked={formData.vat_applicable}
                onChange={handleChange}
                className="w-5 h-5 cursor-pointer"
              />
              <span className="font-semibold text-gray-700">Apply VAT (2.5%)?</span>
            </label>
          </div>

          {formData.vat_applicable && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                VAT Adjustment (৳) - Add or Subtract to Round VAT
              </label>
              <input
                type="number"
                name="vat_adjustment"
                value={formData.vat_adjustment}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-200 transition-all"
                placeholder="e.g., +2 or -1"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Enter positive to add or negative to subtract from the calculated VAT amount</p>
            </div>
          )}

          {/* Display calculated values */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-orange-200">
            <div>
              <p className="text-xs text-gray-600 font-semibold">VAT Amount</p>
              <p className="text-lg font-bold text-orange-600">৳ {calculatedValues.vat_amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">Total Price</p>
              <p className="text-lg font-bold text-orange-600">৳ {calculatedValues.total_price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">Payable on Arrival</p>
              <p className="text-lg font-bold text-emerald-600">৳ {calculatedValues.checkout_payable.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Remarks Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          📝 Remarks & Special Requests
        </label>
        <textarea
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 transition-all hover:border-emerald-300 placeholder-gray-400"
          placeholder="e.g., Extra bed, Late checkout, Special amenities, etc."
          rows={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-xl hover:scale-105 active:scale-95"
        >
          {isLoading ? (
            <>
              <Loader size={18} className="animate-spin" />
              Processing...
            </>
          ) : (
            'Add Booking'
          )}
        </button>

        {/* WhatsApp Actions (show after successful booking) */}
        {successBooking && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={isLoading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 hover:shadow-lg"
            >
              <MessageCircle size={18} />
              Send WhatsApp Confirmation
            </button>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 hover:shadow-lg"
            >
              <Copy size={18} />
              Copy Message to Clipboard
            </button>
          </div>
        )}
      </div>
    </form>
  );
};

export default BookingForm;