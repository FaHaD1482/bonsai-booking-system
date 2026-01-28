import React, { useEffect, useState } from 'react';
import supabase from '../services/supabaseClient';
import { Booking, Expense, DateRangeType } from '../types';
import { Users, DollarSign, DoorOpen, Loader, TrendingUp, Calendar, TrendingDown } from 'lucide-react';

interface StatisticsDashboardProps {
  refresh?: number;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ refresh }) => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    advanceCollected: 0,
    activeRooms: 0,
    pendingPayment: 0,
    totalVAT: 0,
    totalCheckoutPayable: 0,
    totalRefunds: 0,
    totalExpenses: 0,
    profitLoss: 0,
    monthlyBookings: Array(12).fill(0),
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchStats();
  }, [dateRange, customStartDate, customEndDate, refresh]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching statistics...');
      
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

      console.log('📅 Date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);

      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .gte('check_in', startDate.toISOString().split('T')[0])
        .lte('check_in', endDate.toISOString().split('T')[0]);

      if (bookingsError) {
        console.error('❌ Fetch bookings error:', bookingsError);
        throw bookingsError;
      }

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0]);

      if (expensesError) {
        console.error('❌ Fetch expenses error:', expensesError);
        throw expensesError;
      }

      console.log('✅ Fetched bookings:', bookingsData?.length || 0, 'records');
      console.log('✅ Fetched expenses:', expensesData?.length || 0, 'records');

      const bookings = (bookingsData || []) as Booking[];
      const expenses = (expensesData || []) as Expense[];
      const currentNow = new Date();

      const totalBookings = bookings.length;
      const advanceCollected = bookings.reduce((sum, b) => sum + (b.advance || 0), 0);
      const totalVAT = bookings.reduce((sum, b) => sum + (b.vat_amount || 0), 0);
      const totalCheckoutPayable = bookings.reduce((sum, b) => sum + (b.checkout_payable || 0), 0);
      const totalRefunds = bookings.reduce((sum, b) => sum + (b.refund_amount || 0), 0);
      
      // Calculate total revenue from revenue column in database
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.revenue || 0), 0);
      
      // Calculate total booking amount and pending
      const totalAmount = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
      const pendingPayment = bookings.reduce((sum, b) => sum + (b.pending_amount || 0), 0);

      // Calculate total expenses
      const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // Count rooms with active bookings (check-in <= now <= check-out)
      const activeRooms = new Set(
        bookings
          .filter((b) => {
            const checkIn = new Date(b.check_in);
            const checkOut = new Date(b.check_out);
            return checkIn <= currentNow && currentNow < checkOut;
          })
          .map((b) => b.room_id)
      ).size;

      // Count bookings by month
      const monthlyData = Array(12).fill(0);
      bookings.forEach((b) => {
        const checkInDate = new Date(b.check_in);
        monthlyData[checkInDate.getMonth()]++;
      });

      // Calculate profit/loss
      const profitLoss = totalRevenue;

      console.log('📈 Statistics calculated:', { totalBookings, advanceCollected, activeRooms, pendingPayment, totalVAT, totalRefunds, totalExpenses, profitLoss, totalRevenue });

      setStats({
        totalBookings,
        advanceCollected,
        activeRooms,
        pendingPayment,
        totalVAT,
        totalCheckoutPayable,
        totalRefunds,
        totalExpenses,
        profitLoss,
        monthlyBookings: monthlyData,
      });
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    icon: Icon,
    title,
    value,
    unit = '',
    color = 'from-emerald-500 to-teal-600',
  }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    unit?: string;
    color?: string;
  }) => (
    <div className={`bg-gradient-to-br ${color} rounded-xl shadow-xl p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer relative overflow-hidden group`}>
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-sm opacity-90 font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2">
            {value}
            {unit && <span className="text-lg ml-1">{unit}</span>}
          </p>
        </div>
        <div className="text-5xl opacity-20 group-hover:opacity-30 transition-opacity duration-300">
          {typeof Icon === 'string' ? (
            <span>{Icon}</span>
          ) : (
            Icon
          )}
        </div>
      </div>
    </div>
  );

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader size={32} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="text-emerald-600" size={20} />
          <h3 className="font-semibold text-gray-800">Date Range</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => {
                setDateRange(range);
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                dateRange === range
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-emerald-400'
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
                : 'bg-white text-gray-700 border border-gray-300 hover:border-emerald-400'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Custom Date Range Inputs */}
        {dateRange === 'custom' && (
          <div className="flex gap-3 mt-3">
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
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={40} />}
          title="Total Bookings"
          value={stats.totalBookings}
          color="from-emerald-500 to-teal-600"
        />
        <StatCard
          icon={<DollarSign size={40} />}
          title="Payment Collected"
          value={`৳ ${(stats.advanceCollected)}`}
          color="from-blue-500 to-cyan-600"
        />
        <StatCard
          icon={<TrendingUp size={40} />}
          title="Pending Payment"
          value={`৳ ${(stats.pendingPayment)}`}
          color="from-orange-500 to-red-600"
        />
        <StatCard
          icon={<DoorOpen size={40} />}
          title="Active Rooms"
          value={stats.activeRooms}
          color="from-purple-500 to-pink-600"
        />
      </div>

      {/* New Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign size={40} />}
          title="Total VAT"
          value={`৳ ${(stats.totalVAT)}`}
          color="from-amber-500 to-orange-600"
        />
        <StatCard
          icon={<TrendingUp size={40} />}
          title="Total Payable"
          value={`৳ ${(stats.totalCheckoutPayable)}`}
          color="from-violet-500 to-purple-600"
        />
        <StatCard
          icon={<TrendingDown size={40} />}
          title="Total Refunds"
          value={`৳ ${(stats.totalRefunds)}`}
          color="from-red-500 to-pink-600"
        />
        <StatCard
          icon={stats.profitLoss >= 0 ? <TrendingUp size={40} /> : <TrendingDown size={40} />}
          title="Revenue"
          value={`৳ ${(stats.profitLoss)}`}
          color={stats.profitLoss >= 0 ? "from-green-500 to-emerald-600" : "from-red-500 to-rose-600"}
        />
      </div>

      {/* Monthly Bookings Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-emerald-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="text-emerald-600" size={24} />
          Monthly Booking Trends (Target: 200 bookings)
        </h3>
        <div className="space-y-4">
          {monthLabels.map((month, index) => {
            const bookingCount = stats.monthlyBookings[index];
            const targetBookings = 200;
            const percentage = Math.min((bookingCount / targetBookings) * 100, 100);
            return (
              <div key={month} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{month}</span>
                  <span className="text-sm font-bold text-emerald-600">{bookingCount} / {targetBookings}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(percentage, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatisticsDashboard;
