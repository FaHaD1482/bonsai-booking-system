import React, { useState, useEffect } from 'react';
import supabase from '../services/supabaseClient';
import { Room } from '../types';
import { Plus, Trash2, Edit2, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import useAuth from '../hooks/useAuth';

interface RoomForm {
  name: string;
  capacity: number;
  type: string;
}

const RoomManager: React.FC = () => {
  const { isAdmin } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  const [formData, setFormData] = useState<RoomForm>({
    name: '',
    capacity: 2,
    type: 'Standard',
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      console.log('📥 Fetching rooms...');
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ Fetch error:', error);
        throw error;
      }
      
      console.log('✅ Rooms fetched:', data?.length || 0, 'rooms');
      setRooms(data || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setStatus({
        type: 'error',
        message: 'Failed to fetch rooms',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        setStatus({
          type: 'error',
          message: 'Room name is required',
        });
        setLoading(false);
        return;
      }

      if (editingId) {
        // Update existing room
        console.log('🔄 Updating room:', editingId);
        const { error, data } = await supabase
          .from('rooms')
          .update({
            name: formData.name,
            capacity: formData.capacity,
            type: formData.type,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)
          .select();

        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }

        console.log('✅ Room updated:', data);

        setStatus({
          type: 'success',
          message: 'Room updated successfully!',
        });
      } else {
        // Add new room
        console.log('➕ Adding new room:', formData.name);
        const { error, data } = await supabase
          .from('rooms')
          .insert([
            {
              name: formData.name,
              capacity: formData.capacity,
              type: formData.type,
            },
          ])
          .select();

        if (error) {
          console.error('❌ Insert error:', error);
          throw error;
        }

        console.log('✅ Room added:', data);

        setStatus({
          type: 'success',
          message: 'Room added successfully!',
        });
      }

      // Reset form
      setFormData({
        name: '',
        capacity: 2,
        type: 'Standard',
      });
      setEditingId(null);
      setShowForm(false);

      // Refresh rooms list
      await fetchRooms();

      // Clear status after 3 seconds
      setTimeout(() => {
        setStatus({ type: 'idle', message: '' });
      }, 3000);
    } catch (err: any) {
      console.error('Error saving room:', err);
      setStatus({
        type: 'error',
        message: err.message || 'Failed to save room',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (room: Room) => {
    setFormData({
      name: room.name,
      capacity: room.capacity,
      type: room.type,
    });
    setEditingId(room.id);
    setShowForm(true);
  };

  const handleDelete = async (roomId: string) => {
    if (!window.confirm('Are you sure you want to delete this room?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting room:', roomId);
      const { error, data } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)
        .select();

      if (error) {
        console.error('❌ Delete error:', error);
        throw error;
      }

      console.log('✅ Room deleted:', data);

      setStatus({
        type: 'success',
        message: 'Room deleted successfully!',
      });

      await fetchRooms();

      setTimeout(() => {
        setStatus({ type: 'idle', message: '' });
      }, 3000);
    } catch (err: any) {
      console.error('Error deleting room:', err);
      setStatus({
        type: 'error',
        message: err.message || 'Failed to delete room',
      });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      capacity: 2,
      type: 'Standard',
    });
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        <div className="flex items-center justify-between mb-6">
          <h2 className="card-title text-2xl font-bold text-emerald-700 flex items-center gap-2">
            <span>🏠</span> Room Management
          </h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-sm btn-emerald gap-2"
            >
              <Plus size={18} />
              Add New Room
            </button>
          )}
        </div>

        {/* Status Messages */}
        {status.type !== 'idle' && (
          <div
            className={`alert alert-${status.type === 'success' ? 'success' : 'error'} mb-4 flex items-center gap-2`}
          >
            {status.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{status.message}</span>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="mb-6 p-4 border-2 border-emerald-300 rounded-lg bg-emerald-50">
            <h3 className="font-bold text-lg mb-4">
              {editingId ? 'Edit Room' : 'Add New Room'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Room Name */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Room Name *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Brishti Bilash"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input input-bordered input-emerald focus:outline-none"
                  required
                />
              </div>

              {/* Capacity */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Capacity *</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: parseInt(e.target.value),
                    })
                  }
                  className="input input-bordered input-emerald focus:outline-none"
                  required
                />
              </div>

              {/* Room Type */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Room Type *</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="select select-bordered select-emerald focus:outline-none"
                  required
                >
                  <option value="Standard">Standard</option>
                  <option value="Cottage">Cottage</option>
                  <option value="Deluxe">Deluxe</option>
                  <option value="Duplex">Duplex</option>
                  <option value="Semi-Duplex">Semi-Duplex</option>
                  <option value="Premium">Premium</option>
                  <option value="Tent">Tent</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-emerald flex-1 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      {editingId ? 'Update Room' : 'Add Room'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rooms List */}
        <div className="overflow-x-auto">
          <table className="table table-compact w-full">
            <thead>
              <tr className="bg-emerald-100">
                <th className="font-bold text-emerald-900">Room Name</th>
                <th className="font-bold text-emerald-900">Capacity</th>
                <th className="font-bold text-emerald-900">Type</th>
                <th className="font-bold text-emerald-900 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    No rooms available. Add one to get started!
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-emerald-50">
                    <td className="font-semibold text-gray-800">{room.name}</td>
                    <td>
                      <span className="badge badge-emerald text-xs sm:text-sm sm:badge-lg whitespace-nowrap">
                        {room.capacity} guest{room.capacity !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-outline text-xs sm:text-sm whitespace-nowrap">{room.type}</span>
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(room)}
                          className="btn btn-ghost btn-sm gap-1"
                          title="Edit room"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(room.id)}
                          className="btn btn-ghost btn-sm gap-1 text-red-600 hover:bg-red-100"
                          title="Delete room"
                        >
                          <Trash2 size={16} />
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
    </div>
  );
};

export default RoomManager;
