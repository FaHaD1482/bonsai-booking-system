import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Plus, Search, Filter, Download, Edit2, Trash2, X } from 'lucide-react';
import supabase from '../services/supabaseClient';
import { Expense, Booking } from '../types';

export default function ExpensePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'Employees',
    description: '',
    amount: '',
    payment_method: 'Cash'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filter & pagination state
  const [dateRange, setDateRange] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Expense>>({});

  // Load data
  useEffect(() => {
    fetchExpenses();
    fetchBookings();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = expenses;

    // Date range filter
    if (dateRange === 'monthly') {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      filtered = filtered.filter(e => {
        // Filter expenses and revenue within the month
        const expDate = new Date(e.expense_date);
        return expDate >= firstDay && expDate <= lastDay;
      });
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      filtered = filtered.filter(e => {
        const expDate = new Date(e.expense_date);
        return expDate >= startDate && expDate <= endDate;
      });
    }

    // Category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredExpenses(filtered);
    setCurrentPage(1);
  }, [expenses, dateRange, customStartDate, customEndDate, categoryFilter, searchTerm]);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      
      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*');
      
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.expense_date) errors.expense_date = 'Date is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    if (!formData.description) errors.description = 'Description is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddExpense = async () => {
    if (!validateForm()) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .insert([
          {
            expense_date: formData.expense_date,
            category: formData.category,
            description: formData.description,
            amount: Number(formData.amount),
            payment_method: formData.payment_method,
            created_by: (await supabase.auth.getSession()).data.session?.user.id
          }
        ]);

      if (error) throw error;

      // Reset form
      setFormData({
        expense_date: new Date().toISOString().split('T')[0],
        category: 'Employees',
        description: '',
        amount: '',
        payment_method: 'Cash'
      });
      setFormErrors({});
      setShowForm(false);

      // Refresh expenses
      fetchExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      setFormErrors({ submit: 'Failed to add expense' });
    }
  };

  const handleEditExpense = async () => {
    if (!editingId || !editData.amount || editData.amount <= 0) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          category: editData.category,
          description: editData.description,
          amount: Number(editData.amount),
          payment_method: editData.payment_method,
          expense_date: editData.expense_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;

      setEditingId(null);
      setEditData({});
      fetchExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  // Calculate metrics
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  
  // Filter bookings by date range (same as filteredExpenses)
  let filteredBookings = bookings;
  if (dateRange === 'monthly') {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    filteredBookings = filteredBookings.filter(b => {
      // Filter bookings within the month based on check_in (was created_at)
      const bookDate = new Date(b.check_in || new Date());
      return bookDate >= firstDay && bookDate <= lastDay;
    });
  } else if (dateRange === 'custom' && customStartDate && customEndDate) {
    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);
    filteredBookings = filteredBookings.filter(b => {
      const bookDate = new Date(b.check_in || new Date());
      return bookDate >= startDate && bookDate <= endDate;
    });
  }

  let totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.revenue || 0), 0);
  const totalAdvance = filteredBookings.reduce((sum, b) => sum + (b.advance || 0), 0);
  const totalVAT = filteredBookings.reduce((sum, b) => sum + (b.vat_amount || 0), 0);
  const totalCheckoutPayable = filteredBookings.reduce((sum, b) => sum + (b.checkout_payable || 0), 0);
  const totalRefunds = filteredBookings.reduce((sum, b) => sum + (b.refund_amount || 0), 0);

  const profitLoss = totalRevenue - totalExpenses;

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIdx, startIdx + itemsPerPage);

  const exportToCSV = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method'];
    const rows = filteredExpenses.map(e => [
      new Date(e.expense_date).toLocaleDateString(),
      e.category,
      e.description || '',
      `${Number(e.amount).toFixed(2)}`,
      e.payment_method || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Expense Management</h1>
        <p className="text-slate-600">Track expenses and monitor profit/loss</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold mt-2">৳ {totalRevenue.toFixed(2)}</p>
            </div>
            <TrendingUp size={24} className="text-emerald-200" />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-rose-100 text-sm font-medium">Total Expenses</p>
              <p className="text-2xl font-bold mt-2">৳ {totalExpenses.toFixed(2)}</p>
            </div>
            <TrendingDown size={24} className="text-rose-200" />
          </div>
        </div>

        {/* Total VAT */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-amber-100 text-sm font-medium">Total VAT</p>
              <p className="text-2xl font-bold mt-2">৳ {totalVAT.toFixed(2)}</p>
            </div>
            <DollarSign size={24} className="text-amber-200" />
          </div>
        </div>

        {/* Profit/Loss */}
        <div className={`bg-gradient-to-br ${profitLoss >= 0 ? 'from-blue-500 to-blue-600' : 'from-red-500 to-red-600'} rounded-lg p-6 text-white shadow-lg hover:shadow-xl transition`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm font-medium ${profitLoss >= 0 ? 'text-blue-100' : 'text-red-100'}`}>Profit/Loss</p>
              <p className="text-2xl font-bold mt-2">৳ {profitLoss.toFixed(2)}</p>
            </div>
            {profitLoss >= 0 ? <TrendingUp size={24} className="text-blue-200" /> : <TrendingDown size={24} className="text-red-200" />}
          </div>
        </div>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 shadow border-l-4 border-cyan-500">
          <p className="text-slate-600 text-sm">Total Advance</p>
          <p className="text-xl font-bold text-slate-900">৳ {totalAdvance.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border-l-4 border-purple-500">
          <p className="text-slate-600 text-sm">Total Payable</p>
          <p className="text-xl font-bold text-slate-900">৳ {totalCheckoutPayable.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border-l-4 border-orange-500">
          <p className="text-slate-600 text-sm">Total Refunds</p>
          <p className="text-xl font-bold text-slate-900">৳ {totalRefunds.toFixed(2)}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="monthly">This Month</option>
              <option value="custom">Custom Period</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All">All Categories</option>
              <option value="Employees">Employees</option>
              <option value="Utilities">Utilities</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Export Button */}
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
            >
              <Download size={18} />
              Export
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
            >
              <Plus size={18} />
              Add
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-emerald-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900">Add New Expense</h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                  formErrors.expense_date ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {formErrors.expense_date && <p className="text-red-500 text-xs mt-1">{formErrors.expense_date}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="Employees">Employees</option>
                <option value="Utilities">Utilities</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Card</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Amount (৳)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                  formErrors.amount ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {formErrors.amount && <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <input
                type="text"
                placeholder="Enter expense description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                  formErrors.description ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
            </div>
          </div>

          {formErrors.submit && <p className="text-red-500 text-sm mt-3">{formErrors.submit}</p>}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAddExpense}
              className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition"
            >
              Save Expense
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Description</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Payment</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No expenses found
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((expense, idx) => (
                  <tr key={expense.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} >
                    {editingId === expense.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="date"
                            value={editData.expense_date || ''}
                            onChange={(e) => setEditData({ ...editData, expense_date: e.target.value })}
                            className="px-3 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={editData.category || ''}
                            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                            className="px-3 py-1 border border-slate-300 rounded text-sm"
                          >
                            <option value="Employees">Employees</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editData.description || ''}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            className="px-3 py-1 border border-slate-300 rounded text-sm w-full"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            step="0.01"
                            value={editData.amount || ''}
                            onChange={(e) => setEditData({ ...editData, amount: Number(e.target.value) })}
                            className="px-3 py-1 border border-slate-300 rounded text-sm w-24"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={editData.payment_method || ''}
                            onChange={(e) => setEditData({ ...editData, payment_method: e.target.value })}
                            className="px-3 py-1 border border-slate-300 rounded text-sm"
                          >
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Card">Card</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 flex gap-2">
                          <button
                            onClick={handleEditExpense}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 bg-slate-300 hover:bg-slate-400 text-slate-900 text-sm rounded font-medium"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {new Date(expense.expense_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{expense.description}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          ৳ {Number(expense.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{expense.payment_method}</td>
                        <td className="px-6 py-4 flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(expense.id);
                              setEditData(expense);
                            }}
                            className="text-blue-500 hover:text-blue-700 transition"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-500 hover:text-red-700 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} expenses
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    currentPage === page
                      ? 'bg-blue-500 text-white'
                      : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
