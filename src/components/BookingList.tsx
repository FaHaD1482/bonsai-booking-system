import React, { useEffect, useState } from 'react';
import supabase from '../services/supabaseClient';
import { Booking } from '../types';
import { formatDateDisplay } from '../utils/bookingUtils';
import { Trash2, Loader, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface BookingWithRoom extends Booking {
  room_name?: string;
}

interface BookingListProps {
  refresh?: boolean;
}

type DateRangeType = 'week' | 'month' | 'custom';

const BookingList: React.FC<BookingListProps> = ({ refresh }) => {
  const [allBookings, setAllBookings] = useState<BookingWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Confirmed' | 'Paid' | 'Checked-out'>('All');
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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
        endDate.setDate(endDate.getDate() + 6); // Friday to next Thursday
      } else if (dateRange === 'month') {
        // Current month (1st to last day)
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (dateRange === 'custom') {
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        }
      }

      console.log('📅 Fetching bookings from:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);

      // Fetch bookings with room names joined
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, rooms(name)')
        .gte('check_in', startDate.toISOString().split('T')[0])
        .lte('check_in', endDate.toISOString().split('T')[0])
        .order('check_in', { ascending: false });

      if (bookingsError) {
        console.error('❌ Fetch bookings error:', bookingsError);
        throw bookingsError;
      }
      
      // Transform data to include room_name
      const bookingsWithRooms = (bookingsData || []).map((booking: any) => ({
        ...booking,
        room_name: booking.rooms?.name || 'Unknown Room',
      }));

      console.log('✅ Bookings fetched:', bookingsWithRooms?.length || 0, 'records');
      setAllBookings(bookingsWithRooms);
      setCurrentPage(1);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch bookings';
      console.error('❌ Error:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;

    try {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) throw error;
      await fetchBookings();
    } catch (err) {
      console.error('❌ Delete error:', err);
    }
  };

  const handleStatusChange = async (booking: Booking, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
      
      // If status is "Checked-out", set advance to full price
      if (newStatus === 'Checked-out') {
        updateData.advance = booking.price;
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id);
      if (error) throw error;
      await fetchBookings();
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  // Filter bookings
  const filteredBookings = allBookings.filter((booking) => {
    const matchesSearch =
      booking.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.room_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          </div>
        </div>

        {/* Custom Date Range */}
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

        {/* Search and Status Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="🔍 Search by guest name or room..."
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
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
              <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Guest Name</th>
              <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Room Name</th>
              <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Check-in</th>
              <th className="px-2 sm:px-6 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Check-out</th>
              <th className="px-2 sm:px-6 py-2 sm:py-4 text-right text-xs sm:text-sm font-semibold text-gray-700">Price</th>
              <th className="px-2 sm:px-6 py-2 sm:py-4 text-right text-xs sm:text-sm font-semibold text-gray-700">Advance</th>
              <th className="px-2 sm:px-6 py-2 sm:py-4 text-center text-xs sm:text-sm font-semibold text-gray-700">Status</th>
              <th className="px-2 sm:px-6 py-2 sm:py-4 text-center text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-500">
                  No bookings found
                </td>
              </tr>
            ) : (
              paginatedBookings.map((booking, index) => (
                <tr key={booking.id} className={`border-b border-gray-200 hover:bg-emerald-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-base font-semibold text-gray-900">{booking.guest_name}</td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4">
                    <span className="bg-emerald-100 text-emerald-800 px-2 sm:px-3 py-1 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap">
                      {booking.room_name}
                    </span>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-base text-gray-700">{formatDateDisplay(booking.check_in)}</td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-base text-gray-700">{formatDateDisplay(booking.check_out)}</td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 text-right text-xs sm:text-base font-semibold text-gray-900">৳{booking.price.toLocaleString()}</td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 text-right text-xs sm:text-base font-semibold text-teal-600">৳{booking.advance.toLocaleString()}</td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">
                    <select
                      value={booking.status}
                      onChange={(e) => handleStatusChange(booking, e.target.value)}
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border-0 cursor-pointer ${
                        booking.status === 'Confirmed'
                          ? 'bg-blue-100 text-blue-800'
                          : booking.status === 'Paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Paid">Paid</option>
                      <option value="Checked-out">Checked-out</option>
                    </select>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">
                    <button
                      onClick={() => handleDelete(booking.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition"
                      title="Delete booking"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Footer */}
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-t border-emerald-100 space-y-4">
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-gray-600 font-medium text-center sm:text-left">
              Page {currentPage} of {totalPages} ({filteredBookings.length} total)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 text-sm"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 text-sm"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
        <div className="text-sm text-gray-600 font-medium">
          Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
        </div>
      </div>
    </div>
  );
};

export default BookingList;