import React, { useState, useEffect } from 'react';
import supabase from '../services/supabaseClient';
import { Booking, BookingRoom, Room } from '../types';
import { checkRoomConflict, checkMultiRoomConflict, formatDate } from '../utils/bookingUtils';
import { calculateVAT, calculateTotalPrice, calculateCheckoutPayable, validatePhoneNumber, formatPhoneNumber, validateEmail, calculateMultiRoomTotal } from '../utils/calculationUtils';
import { generateWhatsAppMessage, sendWhatsAppMessage, copyToClipboard } from '../services/whatsappService';
import { Loader, MessageCircle, Copy, Plus, Trash2 } from 'lucide-react';
import RoomSelector from './RoomSelector';
import { useModal } from '../hooks/useModal';

interface BookingFormProps {
  onBookingAdded?: () => void;
}

interface RoomBooking {
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  price_per_night: string;
  vat: string;
}

const BookingForm: React.FC<BookingFormProps> = ({ onBookingAdded }) => {
  const [bookingType, setBookingType] = useState<'single' | 'multi'>('single');
  
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    booking_no: '',
    room_id: '', // For single room bookings
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

  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>([]);

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

  // Recalculate VAT and totals when price or VAT selection changes (single room)
  useEffect(() => {
    if (bookingType === 'single') {
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
    }
  }, [formData.price, formData.vat_applicable, formData.vat_adjustment, formData.advance, bookingType]);

  // Recalculate for multi-room bookings
  useEffect(() => {
    if (bookingType === 'multi' && roomBookings.length > 0) {
      const totals = calculateMultiRoomTotal(roomBookings, formData.vat_applicable, parseFloat(formData.vat_adjustment) || 0);
      const advance = parseFloat(formData.advance) || 0;
      const payable = calculateCheckoutPayable(totals.total_price, advance);

      setCalculatedValues({
        vat_amount: totals.vat_amount,
        total_price: totals.total_price,
        checkout_payable: payable,
      });
    }
  }, [roomBookings, formData.vat_applicable, formData.vat_adjustment, formData.advance, bookingType]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, booking_rooms(*)')
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

    if (bookingType === 'single') {
      if (!formData.room_id) errors.room_id = 'Room selection is required';
      if (!formData.check_in) errors.check_in = 'Check-in date is required';
      if (!formData.check_out) errors.check_out = 'Check-out date is required';
      if (new Date(formData.check_in) >= new Date(formData.check_out)) {
        errors.check_out = 'Check-out must be after check-in';
      }
      if (!formData.price) errors.price = 'Price is required';
    } else {
      if (roomBookings.length === 0) errors.roomBookings = 'At least one room must be added';
      if (!formData.check_in) errors.check_in = 'Overall check-in date is required';
      if (!formData.check_out) errors.check_out = 'Overall check-out date is required';
      if (new Date(formData.check_in) >= new Date(formData.check_out)) {
        errors.check_out = 'Check-out must be after check-in';
      }
      // Validate individual room bookings
      for (let i = 0; i < roomBookings.length; i++) {
        const rb = roomBookings[i];
        if (!rb.room_id) errors[`room_${i}`] = 'Room is required';
        if (!rb.check_in_date) errors[`check_in_${i}`] = 'Check-in date is required';
        if (!rb.check_out_date) errors[`check_out_${i}`] = 'Check-out date is required';
        if (rb.check_in_date && rb.check_out_date && new Date(rb.check_in_date) >= new Date(rb.check_out_date)) {
          errors[`check_out_${i}`] = 'Check-out must be after check-in';
        }
        if (!rb.price_per_night) errors[`price_${i}`] = 'Price is required';
      }
    }

    if (!formData.advance) errors.advance = 'Advance amount is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addRoomBooking = () => {
    setRoomBookings([
      ...roomBookings,
      {
        room_id: '',
        check_in_date: formData.check_in,
        check_out_date: formData.check_out,
        price_per_night: '',
        vat: '0',
      },
    ]);
  };

  const removeRoomBooking = (index: number) => {
    setRoomBookings(roomBookings.filter((_, i) => i !== index));
  };

  const updateRoomBooking = (index: number, field: keyof RoomBooking, value: string) => {
    const updated = [...roomBookings];
    updated[index] = { ...updated[index], [field]: value };
    setRoomBookings(updated);
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
        .select('*, booking_rooms(*)')
        .neq('status', 'Checked-out');

      if (fetchError) throw fetchError;

      if (bookingType === 'single') {
        // SINGLE ROOM BOOKING FLOW
        const newBooking = {
          guest_name: formData.guest_name,
          guest_phone: formatPhoneNumber(formData.guest_phone),
          guest_email: formData.guest_email || undefined,
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
          remarks: formData.remarks || undefined,
          num_adults: parseInt(formData.num_adults) || 1,
          status: 'Confirmed' as const,
          guest_count: parseInt(formData.num_adults) || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          revenue: parseFloat(formData.advance),
          pending_amount: parseFloat(formData.price) - parseFloat(formData.advance),
          refund_amount: 0,
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

        // Insert single room booking
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
      } else {
        // MULTI-ROOM BOOKING FLOW
        // Prepare room date ranges for conflict checking
        const roomDateRanges = roomBookings.map(rb => ({
          room_id: rb.room_id,
          check_in: rb.check_in_date,
          check_out: rb.check_out_date,
        }));

        // Check conflicts for all rooms
        const conflictCheck = checkMultiRoomConflict(roomDateRanges, latestBookings || []);

        if (conflictCheck.hasConflict && conflictCheck.conflictingBooking) {
          const conflicting = conflictCheck.conflictingBooking;
          showAlert(
            'Room Conflict',
            `One or more rooms are already booked during the selected dates.\nConflicting booking: ${conflicting.booking_no} (${conflicting.guest_name})`,
            'error'
          );
          setIsLoading(false);
          return;
        }

        // Create multi-room booking
        const newBooking = {
          guest_name: formData.guest_name,
          guest_phone: formatPhoneNumber(formData.guest_phone),
          guest_email: formData.guest_email || undefined,
          booking_no: formData.booking_no,
          room_id: null, // Multi-room bookings don't have a primary room
          check_in: formatDate(formData.check_in),
          check_out: formatDate(formData.check_out),
          check_in_time: formData.check_in_time,
          check_out_time: formData.check_out_time,
          price: calculatedValues.total_price - calculatedValues.vat_amount,
          advance: parseFloat(formData.advance),
          vat_applicable: formData.vat_applicable,
          vat_amount: calculatedValues.vat_amount,
          checkout_payable: calculatedValues.checkout_payable,
          remarks: formData.remarks || undefined,
          num_adults: parseInt(formData.num_adults) || 1,
          status: 'Confirmed' as const,
          guest_count: parseInt(formData.num_adults) || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          revenue: parseFloat(formData.advance),
          pending_amount: calculatedValues.total_price - parseFloat(formData.advance) - calculatedValues.vat_amount,
          refund_amount: 0,
          total_rooms: roomBookings.length,
        };

        // Insert booking and room entries
        const { data: insertedData, error: bookingError } = await supabase
          .from('bookings')
          .insert([newBooking])
          .select();

        if (bookingError) throw bookingError;

        const createdBooking = insertedData?.[0];

        // Insert booking_rooms entries
        const bookingRoomEntries = roomBookings.map(rb => ({
          booking_id: createdBooking.id,
          room_id: rb.room_id,
          check_in_date: rb.check_in_date,
          check_out_date: rb.check_out_date,
          price_per_night: parseFloat(rb.price_per_night),
          vat: parseFloat(rb.vat) || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error: roomsError } = await supabase
          .from('booking_rooms')
          .insert(bookingRoomEntries);

        if (roomsError) throw roomsError;

        // Fetch booking with rooms for display
        const { data: fullBooking } = await supabase
          .from('bookings')
          .select('*, booking_rooms(*)')
          .eq('id', createdBooking.id)
          .single();

        setSuccessBooking(fullBooking);

        showAlert(
          'Multi-Room Booking Successful',
          `${formData.guest_name} has been booked successfully!\n\nBooking No: ${formData.booking_no}\nRooms: ${roomBookings.length}\nAdvance: ৳${formData.advance}`,
          'success'
        );
      }

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
      setRoomBookings([]);
      setBookingType('single');

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

    setIsLoading(true);

    try {
      const message = generateWhatsAppMessage(successBooking, rooms);
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

    const message = generateWhatsAppMessage(successBooking, rooms);
    if (copyToClipboard(message)) {
      showAlert('Copied', 'Message copied to clipboard!', 'success');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-0 space-y-4 sm:space-y-6">
      {/* Booking Type Toggle */}
      <div className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200">
        <h3 className="text-base sm:text-lg font-bold text-purple-900 mb-3 sm:mb-4">📋 Booking Type</h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <label className="flex items-center gap-2 cursor-pointer p-2 sm:p-3 border-2 rounded-lg transition-all flex-1" style={{borderColor: bookingType === 'single' ? '#10b981' : '#d1d5db', backgroundColor: bookingType === 'single' ? '#ecfdf5' : 'transparent'}}>
            <input
              type="radio"
              name="bookingType"
              value="single"
              checked={bookingType === 'single'}
              onChange={(e) => {
                setBookingType('single');
                setRoomBookings([]);
              }}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="font-semibold text-sm sm:text-base text-gray-700">Single Room</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 sm:p-3 border-2 rounded-lg transition-all flex-1" style={{borderColor: bookingType === 'multi' ? '#10b981' : '#d1d5db', backgroundColor: bookingType === 'multi' ? '#ecfdf5' : 'transparent'}}>
            <input
              type="radio"
              name="bookingType"
              value="multi"
              checked={bookingType === 'multi'}
              onChange={(e) => setBookingType('multi')}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="font-semibold text-sm sm:text-base text-gray-700">Multiple Rooms</span>
          </label>
        </div>
      </div>

      {/* Guest Information Section */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3 sm:p-4 rounded-lg border border-emerald-200">
        <h3 className="text-base sm:text-lg font-bold text-emerald-900 mb-3 sm:mb-4">👤 Guest Information</h3>
        
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
              Guest Name * {formErrors.guest_name && <span className="text-red-500 text-xs">{formErrors.guest_name}</span>}
            </label>
            <input
              type="text"
              name="guest_name"
              value={formData.guest_name}
              onChange={handleChange}
              className={`w-full px-2 sm:px-4 py-2 sm:py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all text-sm ${
                formErrors.guest_name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
              placeholder="e.g., John Doe"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Phone Number * {formErrors.guest_phone && <span className="text-red-500 text-xs">{formErrors.guest_phone}</span>}
              </label>
              <input
                type="tel"
                name="guest_phone"
                value={formData.guest_phone}
                onChange={handleChange}
                className={`w-full px-2 sm:px-4 py-2 sm:py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all text-sm ${
                  formErrors.guest_phone ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200'
                }`}
                placeholder="e.g., +8801XX XXXXXX"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Email {formErrors.guest_email && <span className="text-red-500 text-xs">{formErrors.guest_email}</span>}
              </label>
              <input
                type="email"
                name="guest_email"
                value={formData.guest_email}
                onChange={handleChange}
                className={`w-full px-2 sm:px-4 py-2 sm:py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all text-sm ${
                  formErrors.guest_email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200'
                }`}
                placeholder="e.g., guest@email.com (Optional)"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
              Booking Number * {formErrors.booking_no && <span className="text-red-500 text-xs">{formErrors.booking_no}</span>}
            </label>
            <input
              type="text"
              name="booking_no"
              value={formData.booking_no}
              onChange={handleChange}
              className={`w-full px-2 sm:px-4 py-2 sm:py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all text-sm ${
                formErrors.booking_no ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
              placeholder="e.g., BK202601001"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
              Number of Adults *
            </label>
            <input
              type="number"
              name="num_adults"
              value={formData.num_adults}
              onChange={handleChange}
              className="w-full px-2 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 transition-all text-sm"
              placeholder="e.g., 2"
              min="1"
              max="20"
            />
          </div>
        </div>
      </div>

      {/* Room & Dates Section */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-3 sm:p-4 rounded-lg border border-blue-200">
        <h3 className="text-base sm:text-lg font-bold text-blue-900 mb-3 sm:mb-4">🏠 Room & Dates</h3>
        
        {bookingType === 'single' ? (
          // SINGLE ROOM BOOKING UI
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Room * {formErrors.room_id && <span className="text-red-500 text-xs">{formErrors.room_id}</span>}
              </label>
              <RoomSelector
                value={formData.room_id}
                onChange={(roomId) => {
                  setFormData((prev) => ({ ...prev, room_id: roomId }));
                  const room = rooms.find((r) => r.id === roomId);
                  setSelectedRoom(room || null);
                }}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                  Check-in Date * {formErrors.check_in && <span className="text-red-500 text-xs">{formErrors.check_in}</span>}
                </label>
                <input
                  type="date"
                  name="check_in"
                  value={formData.check_in}
                  onChange={handleChange}
                  className={`w-full px-2 sm:px-4 py-2 sm:py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all text-sm ${
                    formErrors.check_in ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                  Check-in Time
                </label>
                <input
                  type="time"
                  name="check_in_time"
                  value={formData.check_in_time}
                  onChange={handleChange}
                  className="w-full px-2 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                  Check-out Date * {formErrors.check_out && <span className="text-red-500 text-xs">{formErrors.check_out}</span>}
                </label>
                <input
                  type="date"
                  name="check_out"
                  value={formData.check_out}
                  onChange={handleChange}
                  className={`w-full px-2 sm:px-4 py-2 sm:py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all text-sm ${
                    formErrors.check_out ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                  Check-out Time
                </label>
                <input
                  type="time"
                  name="check_out_time"
                  value={formData.check_out_time}
                  onChange={handleChange}
                  className="w-full px-2 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all text-sm"
                />
              </div>
            </div>
          </div>
        ) : (
          // MULTI-ROOM BOOKING UI
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                  Overall Check-in Date * {formErrors.check_in && <span className="text-red-500 text-xs">{formErrors.check_in}</span>}
                </label>
                <input
                  type="date"
                  name="check_in"
                  value={formData.check_in}
                  onChange={handleChange}
                  className={`w-full px-2 sm:px-4 py-2 sm:py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all text-sm ${
                    formErrors.check_in ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                  Overall Check-out Date * {formErrors.check_out && <span className="text-red-500 text-xs">{formErrors.check_out}</span>}
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
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Room Bookings {formErrors.roomBookings && <span className="text-red-500 text-xs">{formErrors.roomBookings}</span>}
                </label>
                <button
                  type="button"
                  onClick={addRoomBooking}
                  className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-all"
                >
                  <Plus size={16} />
                  Add Room
                </button>
              </div>

              <div className="space-y-3">
                {roomBookings.map((rb, idx) => (
                  <div key={idx} className="p-3 bg-white border border-blue-300 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Room {formErrors[`room_${idx}`] && <span className="text-red-500 text-xs block">{formErrors[`room_${idx}`]}</span>}
                        </label>
                        <select
                          value={rb.room_id}
                          onChange={(e) => updateRoomBooking(idx, 'room_id', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                        >
                          <option value="">Select Room</option>
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Check-in {formErrors[`check_in_${idx}`] && <span className="text-red-500 text-xs block">{formErrors[`check_in_${idx}`]}</span>}
                        </label>
                        <input
                          type="date"
                          value={rb.check_in_date}
                          onChange={(e) => updateRoomBooking(idx, 'check_in_date', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Check-out {formErrors[`check_out_${idx}`] && <span className="text-red-500 text-xs block">{formErrors[`check_out_${idx}`]}</span>}
                        </label>
                        <input
                          type="date"
                          value={rb.check_out_date}
                          onChange={(e) => updateRoomBooking(idx, 'check_out_date', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Price/Night {formErrors[`price_${idx}`] && <span className="text-red-500 text-xs block">{formErrors[`price_${idx}`]}</span>}
                        </label>
                        <input
                          type="number"
                          value={rb.price_per_night}
                          onChange={(e) => updateRoomBooking(idx, 'price_per_night', e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => removeRoomBooking(idx)}
                          className="w-full bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm transition-all flex items-center justify-center gap-1"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Pricing Section */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-3 sm:p-4 rounded-lg border border-orange-200">
        <h3 className="text-base sm:text-lg font-bold text-orange-900 mb-3 sm:mb-4">💰 Pricing Details</h3>
        
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {bookingType === 'single' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                  Base Price (৳) * {formErrors.price && <span className="text-red-500 text-xs">{formErrors.price}</span>}
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className={`w-full px-2 sm:px-4 py-2 sm:py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all text-sm ${
                    formErrors.price ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-orange-500 focus:ring-orange-200'
                  }`}
                  placeholder="e.g., 5000"
                  step="0.01"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
              Advance (৳) * {formErrors.advance && <span className="text-red-500 text-xs">{formErrors.advance}</span>}
            </label>
            <input
              type="number"
              name="advance"
              value={formData.advance}
              onChange={handleChange}
              className={`w-full px-2 sm:px-4 py-2 sm:py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all text-sm ${
                formErrors.advance ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-orange-500 focus:ring-orange-200'
              }`}
              placeholder="e.g., 2000"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-2 border-orange-300 rounded-lg hover:bg-orange-50 cursor-pointer">
              <input
                type="checkbox"
                name="vat_applicable"
                checked={formData.vat_applicable}
                onChange={handleChange}
                className="w-4 h-4 sm:w-5 sm:h-5 cursor-pointer"
              />
              <span className="font-semibold text-xs sm:text-base text-gray-700">Apply VAT (2.5%)?</span>
            </label>
          </div>

          {formData.vat_applicable && (
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                VAT Adjustment (৳) - Add or Subtract to Round VAT
              </label>
              <input
                type="number"
                name="vat_adjustment"
                value={formData.vat_adjustment}
                onChange={handleChange}
                className="w-full px-2 sm:px-4 py-2 sm:py-3 border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-200 transition-all text-sm"
                placeholder="e.g., +2 or -1"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Enter positive to add or negative to subtract from the calculated VAT amount</p>
            </div>
          )}

          {/* Display calculated values */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 bg-white p-2 sm:p-4 rounded-lg border border-orange-200">
            <div>
              <p className="text-xs text-gray-600 font-semibold">VAT Amount</p>
              <p className="text-base sm:text-lg font-bold text-orange-600">৳ {calculatedValues.vat_amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">Total Price</p>
              <p className="text-base sm:text-lg font-bold text-orange-600">৳ {calculatedValues.total_price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">Payable on Arrival</p>
              <p className="text-base sm:text-lg font-bold text-emerald-600">৳ {calculatedValues.checkout_payable.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Remarks Section */}
      <div>
        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
          📝 Remarks & Special Requests
        </label>
        <textarea
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          className="w-full px-2 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 transition-all hover:border-emerald-300 placeholder-gray-400 text-sm"
          placeholder="e.g., Extra bed, Late checkout, Special amenities, etc."
          rows={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 sm:space-y-3">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold py-2 sm:py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-xl hover:scale-105 active:scale-95 text-sm sm:text-base"
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
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2 sm:py-3 rounded-lg transition-all flex items-center justify-center gap-2 hover:shadow-lg text-sm sm:text-base"
            >
              <MessageCircle size={18} />
              Send WhatsApp Confirmation
            </button>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 sm:py-3 rounded-lg transition-all flex items-center justify-center gap-2 hover:shadow-lg text-sm sm:text-base"
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