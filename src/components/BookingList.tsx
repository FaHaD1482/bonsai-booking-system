import React, { useEffect, useState } from 'react';
import supabase from '../services/supabaseClient';
import { Booking, DateRangeType } from '../types';
import { formatDateDisplay } from '../utils/bookingUtils';
import { calculateRefund } from '../utils/calculationUtils';
import { Trash2, Loader, Calendar, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import Modal from './Modal';

interface BookingWithRoom extends Booking {
  room_name?: string;
}

interface BookingListProps {
  refresh?: boolean | number;
  onActionComplete?: () => void;
}

const BookingList: React.FC<BookingListProps> = ({ refresh, onActionComplete }) => {
  const [allBookings, setAllBookings] = useState<BookingWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Confirmed' | 'Checked-out' | 'Cancelled' | 'Paid'>('All');
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [refundPolicyBooking, setRefundPolicyBooking] = useState<Booking | null>(null);
  const [customRefundAmount, setCustomRefundAmount] = useState('');
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [extraIncome, setExtraIncome] = useState('0');
  const [discount, setDiscount] = useState('0');
  const { modal, showAlert, showConfirm, handleOk, handleCancel } = useModal();

  useEffect(() => {
    fetchBookings();
  }, [refresh]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching bookings list...');
      
      // Determine date range
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();

      if (dateRange === 'week') {
        // Current week (Friday to Thursday)
        const day = now.getDay();
        const daysBackToFriday = (day - 5 + 7) % 7;
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - daysBackToFriday);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
      } else if (dateRange === 'month') {
        // Current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (dateRange === 'custom') {
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        }
      }

      // Fetch bookings with room names and booking_rooms data for multi-room bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, booking_rooms(*)')
        .gte('check_in', startDate.toISOString().split('T')[0])
        .lte('check_in', endDate.toISOString().split('T')[0])
        .order('check_in', { ascending: true });

      if (bookingsError) throw bookingsError;
      
      // For single-room bookings, fetch room names; for multi-room, use booking_rooms data
      let processedBookings = [];
      
      for (const booking of (bookingsData || [])) {
        let room_name = 'Multi-Room Booking';
        
        // If single-room booking (has room_id), fetch room name
        if (booking.room_id) {
          const { data: roomData } = await supabase
            .from('rooms')
            .select('name')
            .eq('id', booking.room_id)
            .single();
          room_name = roomData?.name || 'Unknown Room';
        } else if (booking.booking_rooms && booking.booking_rooms.length > 0) {
          // Multi-room booking
          const roomIds = booking.booking_rooms.map((br: any) => br.room_id);
          const { data: roomsData } = await supabase
            .from('rooms')
            .select('id, name')
            .in('id', roomIds);
          
          if (roomsData && roomsData.length > 0) {
            room_name = roomsData.map(r => r.name).join(', ');
          }
        }
        
        processedBookings.push({
          ...booking,
          room_name,
        });
      }

      setAllBookings(processedBookings);
      setCurrentPage(1);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch bookings';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm(
      'Delete Booking',
      'Are you sure you want to delete this booking? This action cannot be undone.',
      async () => {
        try {
          // Delete booking_rooms entries first (if any)
          await supabase.from('booking_rooms').delete().eq('booking_id', id);
          
          // Then delete the booking itself
          const { error } = await supabase.from('bookings').delete().eq('id', id);
          if (error) throw error;
          showAlert('Success', 'Booking deleted successfully', 'success', () => {
            fetchBookings();
            onActionComplete?.();
          });
        } catch (err) {
          console.error('Delete error:', err);
          showAlert('Error', 'Failed to delete booking', 'error');
        }
      }
    );
  };

  const handleCancelBooking = async (booking: Booking) => {
    setRefundPolicyBooking(booking);
    setCustomRefundAmount('');
  };

  const processRefund = async (refundType: 'policy' | 'custom') => {
    if (!refundPolicyBooking) return;

    try {
      let refundAmount = 0;
      let refundPolicy = '';

      if (refundType === 'policy') {
        const result = calculateRefund(refundPolicyBooking.price, refundPolicyBooking.check_in, refundPolicyBooking.advance);
        refundAmount = result.refundAmount;
        refundPolicy = result.policy;
      } else {
        refundAmount = parseFloat(customRefundAmount) || 0;
        refundPolicy = 'Custom refund - Based on negotiation';
      }

      // Calculate new values
      const newPendingAmount = 0; // No pending payment for cancelled bookings
      const newRevenue = refundPolicyBooking.advance - refundAmount;
      const advanceCollected = refundPolicyBooking.advance - refundAmount;

      // When cancelling, checkout_payable becomes 0 (no checkout will happen)
      // The refund_amount tracks what we owe back to the guest
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'Cancelled',
          refund_amount: refundAmount,
          checkout_payable: 0,
          pending_amount: newPendingAmount,
          revenue: newRevenue,
          advance: advanceCollected,
          vat_amount: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', refundPolicyBooking.id);

      if (error) throw error;

      showAlert(
        'Booking Cancelled',
        `Refund Amount: ৳${refundAmount.toFixed(2)}\n\nPolicy: ${refundPolicy}\n\nRevenue: ৳${newRevenue.toFixed(2)}`,
        'success',
        () => {
          setRefundPolicyBooking(null);
          setCustomRefundAmount('');
          fetchBookings();
          onActionComplete?.();
        }
      );
    } catch (err) {
      console.error(err);
      showAlert('Error', 'Failed to process refund', 'error');
    }
  };

  const handleCheckout = async (booking: Booking) => {
    setCheckoutBooking(booking);
    setExtraIncome('0');
    setDiscount('0');
  };

  const confirmCheckout = async () => {
    if (!checkoutBooking) return;

    try {
      const extraIncomeAmount = parseFloat(extraIncome) || 0;
      const discountAmount = parseFloat(discount) || 0;

      // Calculate new values
      const totalPrice = checkoutBooking.price + checkoutBooking.vat_amount;
      const finalCheckoutPayable = (totalPrice - checkoutBooking.advance + extraIncomeAmount - discountAmount);
      const newRevenue = checkoutBooking.revenue + finalCheckoutPayable;

      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'Checked-out',
          advance: checkoutBooking.price,
          checkout_payable: 0,
          pending_amount: 0,
          extra_income: extraIncomeAmount,
          discount: discountAmount,
          revenue: newRevenue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', checkoutBooking.id);

      if (error) throw error;

      showAlert(
        'Checkout Successful',
        `Payment Received: ৳${finalCheckoutPayable.toLocaleString()}\n\nExtra Income: ৳${extraIncomeAmount.toLocaleString()}\nDiscount: ৳${discountAmount.toLocaleString()}\n\nTotal Revenue: ৳${newRevenue.toFixed(2)}`,
        'success',
        () => {
          setCheckoutBooking(null);
          fetchBookings();
          onActionComplete?.();
        }
      );
    } catch (err) {
      console.error('Checkout error:', err);
      showAlert('Error', 'Failed to check out: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    }
  };

  // Filter bookings
  const filteredBookings = allBookings.filter((booking) => {
    const matchesSearch =
      booking.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.room_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.guest_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.booking_no?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // CSV Export function
  const downloadCSV = () => {
    if (filteredBookings.length === 0) {
      showAlert('No Data', 'No bookings to download', 'alert');
      return;
    }

    // Define CSV headers
    const headers = ['Booking #', 'Guest Name', 'Phone', 'Email', 'Room', 'Check-in', 'Check-out', 'Remarks', 'Price', 'VAT',  'Payable', 'Extra Income', 'Discount', 'Status', 'Created Date'];

    // Map booking data to CSV rows
    const rows = filteredBookings.map((booking) => [
      booking.booking_no || '',
      booking.guest_name || '',
      booking.guest_phone || '',
      booking.guest_email || '',
      booking.room_name || '',
      formatDateDisplay(booking.check_in),
      formatDateDisplay(booking.check_out),
      booking.remarks || '',
      booking.price.toLocaleString(),
      booking.vat_amount.toLocaleString(),
      booking.checkout_payable.toLocaleString(),
      booking.extra_income.toLocaleString(),
      booking.discount.toLocaleString(),
      booking.status || '',
      new Date(booking.created_at).toLocaleDateString(),
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `booking-data-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('Success', 'Booking data downloaded successfully!', 'success');
  };

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

  if (loading)
    return (
      <div className="flex justify-center items-center p-8">
        <Loader size={32} className="animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-700">Loading bookings...</span>
      </div>
    );

  if (error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <span className="text-red-800">Error: {error}</span>
      </div>
    );

  return (
    <div className="bg-white rounded-lg shadow-lg border border-emerald-100 space-y-4">
      {/* Date Range & Search Filters */}
      <div className="p-6 border-b border-emerald-100 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Calendar size={16} className="text-emerald-600" />
            Date Range
          </label>
          <div className="flex flex-wrap gap-2">
            {(['week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setDateRange(range);
                  setCurrentPage(1);
                  setLoading(true);
                  setTimeout(() => fetchBookings(), 100);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  dateRange === range
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {range === 'week' ? 'Current Week' : 'Current Month'}
              </button>
            ))}
            <button
              onClick={() => setDateRange('custom')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                dateRange === 'custom'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Custom Range
            </button>
            <button
              onClick={downloadCSV}
              className="ml-auto px-4 py-2 rounded-lg font-medium transition bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              title="Download booking data as CSV"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
          </div>
        </div>

        {dateRange === 'custom' && (
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setCurrentPage(1);
                  setLoading(true);
                  setTimeout(() => fetchBookings(), 100);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="🔍 Search by guest, phone, booking no, or room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          >
            <option value="All">All Status</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Paid">Paid</option>
            <option value="Checked-out">Checked-out</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Refund Policy Modal */}
      {refundPolicyBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Process Refund for {refundPolicyBooking.guest_name}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-gray-600">Advance Paid: ৳{refundPolicyBooking.advance}</p>
                <p className="text-xs text-gray-500 mt-1">Check-in: {formatDateDisplay(refundPolicyBooking.check_in)}</p>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Refund Option</label>
                <div className="space-y-2">
                  <button
                    onClick={() => processRefund('policy')}
                    className="w-full px-4 py-2 text-left border-2 border-blue-300 rounded-lg hover:bg-blue-50 font-medium text-sm"
                  >
                    📋 Apply Policy-Based Refund
                  </button>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Enter custom amount"
                      value={customRefundAmount}
                      onChange={(e) => setCustomRefundAmount(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    />
                    <button
                      onClick={() => processRefund('custom')}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm"
                    >
                      Custom
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setRefundPolicyBooking(null)}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto -mx-6 sm:mx-0">
        <div className="sm:mx-0">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
                <th className="px-2 sm:px-3 py-3 text-left font-semibold text-gray-700 min-w-max">Booking #</th>
                <th className="px-2 sm:px-3 py-3 text-left font-semibold text-gray-700 min-w-max">Guest</th>
                <th className="px-2 sm:px-3 py-3 text-left font-semibold text-gray-700 min-w-max">Phone</th>
                <th className="px-2 sm:px-3 py-3 text-left font-semibold text-gray-700 min-w-max">Room</th>
                <th className="px-2 sm:px-3 py-3 text-center font-semibold text-gray-700 min-w-max">Check-in</th>
                <th className="px-2 sm:px-3 py-3 text-center font-semibold text-gray-700 min-w-max">Check-out</th>
                <th className="px-2 sm:px-3 py-3 text-center font-semibold text-gray-700 min-w-max">Remarks</th>
                <th className="px-2 sm:px-3 py-3 text-right font-semibold text-gray-700 min-w-max">Price</th>
                <th className="px-2 sm:px-3 py-3 text-right font-semibold text-gray-700 min-w-max">VAT</th>
                <th className="px-2 sm:px-3 py-3 text-right font-semibold text-gray-700 min-w-max">Extra Income</th>
                <th className="px-2 sm:px-3 py-3 text-right font-semibold text-gray-700 min-w-max">Discount</th>
                <th className="px-2 sm:px-3 py-3 text-right font-semibold text-gray-700 min-w-max">Payable</th>
                <th className="px-2 sm:px-3 py-3 text-center font-semibold text-gray-700 min-w-max">Status</th>
                <th className="px-2 sm:px-3 py-3 text-center font-semibold text-gray-700 min-w-max">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-gray-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((booking, index) => (
                  <tr key={booking.id} className={`border-b border-gray-200 hover:bg-emerald-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-2 sm:px-3 py-3 font-mono text-xs text-gray-600 min-w-max">{booking.booking_no}</td>
                    <td className="px-2 sm:px-3 py-3 font-semibold text-gray-900 min-w-max">{booking.guest_name}</td>
                    <td className="px-2 sm:px-3 py-3 text-xs text-gray-600 min-w-max">{booking.guest_phone}</td>
                    <td className="px-2 sm:px-3 py-3 min-w-max">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                        {booking.room_name}
                      </span>
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-center text-xs text-gray-700 min-w-max">{formatDateDisplay(booking.check_in)}</td>
                    <td className="px-2 sm:px-3 py-3 text-center text-xs text-gray-700 min-w-max">{formatDateDisplay(booking.check_out)}</td>
                    {/* Remarks */}
                    <td className="px-2 sm:px-3 py-3 text-center text-xs text-gray-700 min-w-max max-w-xs truncate" title={booking.remarks}>{booking.remarks || '-'}</td>
                    <td className="px-2 sm:px-3 py-3 text-right font-semibold text-gray-900 min-w-max">৳{booking.price.toLocaleString()}</td>
                    {/* VAT */}
                    <td className="px-2 sm:px-3 py-3 text-right font-semibold text-gray-900 min-w-max">৳{booking.vat_amount.toLocaleString()}</td>
                    <td className="px-2 sm:px-3 py-3 text-right font-semibold text-emerald-600 min-w-max">৳{booking.extra_income.toLocaleString()}</td>
                    <td className="px-2 sm:px-3 py-3 text-right font-semibold text-red-600 min-w-max">৳{booking.discount.toLocaleString()}</td>
                    <td className="px-2 sm:px-3 py-3 text-right font-semibold text-emerald-600 min-w-max">৳{booking.checkout_payable.toLocaleString()}</td>
                    <td className="px-2 sm:px-3 py-3 text-center min-w-max">
                      <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                        booking.status === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                        booking.status === 'Paid' ? 'bg-green-100 text-green-800' :
                        booking.status === 'Checked-out' ? 'bg-purple-100 text-purple-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-center min-w-max">
                      <div className="space-x-1 flex justify-center">
                        {booking.status === 'Confirmed' && (
                          <>
                            <button onClick={() => handleCheckout(booking)} className="p-1 bg-green-500 hover:bg-green-600 text-white rounded" title="Checkout">
                              ✓
                            </button>
                            <button onClick={() => handleCancelBooking(booking)} className="p-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded" title="Cancel & Refund">
                              ↪️
                            </button>
                          </>
                        )}
                        {booking.status === 'Cancelled' && (
                          <span className="text-xs text-gray-500 whitespace-nowrap">No actions</span>
                        )}
                        {booking.status === 'Checked-out' && (
                          <span className="text-xs text-gray-500 whitespace-nowrap">Completed</span>
                        )}
                        <button onClick={() => handleDelete(booking.id)} className="p-1 bg-red-500 hover:bg-red-600 text-white rounded" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination & Footer */}
      <div className="px-4 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-t border-emerald-100 space-y-4">
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 font-medium">
              Page {currentPage} of {totalPages} ({filteredBookings.length} total)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 text-sm"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 text-sm"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
        <div className="text-sm text-gray-600 font-medium">
          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredBookings.length)} of {filteredBookings.length}
        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold text-white">Checkout Confirmation</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Booking Details */}
              <div className="border-b pb-4">
                <p className="text-sm text-gray-600">Guest Name</p>
                <p className="text-lg font-semibold text-gray-800">{checkoutBooking.guest_name}</p>
              </div>

              {/* Base Amount */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Room Price:</span>
                  <span className="font-semibold">৳{checkoutBooking.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">VAT (2.5%):</span>
                  <span className="font-semibold">৳{checkoutBooking.vat_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Advance Paid:</span>
                  <span className="font-semibold text-blue-600">-৳{checkoutBooking.advance.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-gray-700">Base Amount Due:</span>
                  <span className="font-bold text-lg">৳{(checkoutBooking.price + checkoutBooking.vat_amount - checkoutBooking.advance).toLocaleString()}</span>
                </div>
              </div>

              {/* Extra Income Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extra Income <span className="text-xs text-gray-500">(Additional amount from guest)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraIncome}
                  onChange={(e) => setExtraIncome(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Discount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount <span className="text-xs text-gray-500">(Amount to discount from guest)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Total Payable */}
              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800">Total Amount Due:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ৳{(checkoutBooking.price + checkoutBooking.vat_amount - checkoutBooking.advance + parseFloat(extraIncome || '0') - parseFloat(discount || '0')).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setCheckoutBooking(null)}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCheckout}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition"
                >
                  Confirm Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onOk={handleOk}
        onCancel={handleCancel}
        showCancel={modal.showCancel}
        okText={modal.okText}
        cancelText={modal.cancelText}
      />
    </div>
  );
};

export default BookingList;