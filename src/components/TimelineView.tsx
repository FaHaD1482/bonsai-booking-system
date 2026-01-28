import React, { useEffect, useState } from 'react';
import supabase from '../services/supabaseClient';
import { Booking, Room } from '../types';
import { formatDateDisplay } from '../utils/bookingUtils';
import { Loader, Calendar, Users, DollarSign } from 'lucide-react';

interface TimelineViewProps {
  refresh?: number;
}

const TimelineView: React.FC<TimelineViewProps> = ({ refresh }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [refresh]);

  const fetchData = async () => {
    try {
      const [bookingsRes, roomsRes] = await Promise.all([
        supabase.from('bookings').select('*').neq('status', 'Checked-out').neq('status', 'Cancelled').order('check_in', { ascending: true }),
        supabase.from('rooms').select('*').order('name', { ascending: true }),
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (roomsRes.error) throw roomsRes.error;

      setBookings(bookingsRes.data || []);
      setRooms(roomsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group bookings by room
  const groupedByRoom = rooms.reduce(
    (acc, room) => {
      acc[room.id] = bookings.filter((b) => b.room_id === room.id);
      return acc;
    },
    {} as Record<string, Booking[]>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'from-green-500 to-emerald-600';
      case 'Confirmed':
        return 'from-blue-500 to-cyan-600';
      case 'Pending':
        return 'from-orange-500 to-amber-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader size={40} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-emerald-100">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="text-emerald-600" size={28} />
        <h2 className="text-2xl font-bold text-gray-800">Room Occupancy Calendar</h2>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No rooms available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div key={room.id} className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 p-4">
              {/* Room Header */}
              <div className="mb-4 pb-4 border-b border-emerald-300">
                <h3 className="font-bold text-lg text-gray-800">{room.name}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Users size={14} /> Capacity: {room.capacity} guests
                </p>
              </div>

              {/* Room Bookings */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {groupedByRoom[room.id] && groupedByRoom[room.id].length > 0 ? (
                  groupedByRoom[room.id].map((booking) => {
                    const checkIn = new Date(booking.check_in);
                    const checkOut = new Date(booking.check_out);
                    const nights = Math.ceil(
                      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div
                        key={booking.id}
                        className={`bg-gradient-to-r ${getStatusColor(booking.status)} rounded-lg p-3 text-white shadow-md transition hover:shadow-lg`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-tight">{booking.guest_name}</p>
                            <p className="text-xs opacity-90 mt-1 flex items-center gap-1">
                              <Calendar size={12} />
                              {nights}n
                            </p>
                            <p className="text-xs opacity-90 flex items-center gap-1 mt-0.5">
                              {formatDateDisplay(booking.check_in)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(booking.status)}`}>
                              {booking.status === 'Checked-out' ? 'Out' : booking.status.slice(0, 3)}
                            </span>
                            <span className="text-xs font-bold flex items-center gap-0.5">
                              <DollarSign size={12} />
                              {(booking.price / 1000).toFixed(1)}K
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-sm">No active bookings</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimelineView;
