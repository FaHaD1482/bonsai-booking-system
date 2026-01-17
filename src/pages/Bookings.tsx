import React, { useState } from 'react';
import BookingForm from '../components/BookingForm';
import BookingList from '../components/BookingList';
import StatisticsDashboard from '../components/StatisticsDashboard';
import TimelineView from '../components/TimelineView';
import RoomManager from '../components/RoomManager';
import { BarChart3, Plus } from 'lucide-react';

const Bookings: React.FC = () => {
  const [refresh, setRefresh] = useState(false);

  const handleBookingAdded = () => {
    setRefresh(!refresh);
  };

  return (
    <div className="space-y-6 sm:space-y-8 px-3 sm:px-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 sm:p-8 border border-emerald-200">
        <img src="../../src/assets/bonsai.png" alt="Bonsai Eco Village" className="mx-auto mb-4 w-25 h-20" />
        <h1 className="text-xl sm:text-4xl font-bold text-emerald-900 mb-2 text-center">Room Booking Portal</h1>
      </div>

      {/* Statistics Dashboard */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="text-emerald-600 w-6 h-6 sm:w-7 sm:h-7" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Key Metrics</h2>
        </div>
        <StatisticsDashboard />
      </section>

      {/* Room Occupancy Timeline */}
      <section>
        <TimelineView />
      </section>

      {/* Room Management */}
      <section>
        <RoomManager />
      </section>

      {/* Add Booking Form & Booking List */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="text-emerald-600 flex-shrink-0" size={24} />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">New Booking</h2>
          </div>
          <div className="bg-white rounded-lg shadow-lg border border-emerald-100">
            <BookingForm onBookingAdded={handleBookingAdded} />
          </div>
        </div>
        
        <div className="lg:col-span-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">All Bookings</h2>
          <BookingList refresh={refresh} />
        </div>
      </section>
    </div>
  );
};

export default Bookings;