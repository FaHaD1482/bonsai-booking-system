import React, { useEffect, useState } from 'react';
import supabase from '../services/supabaseClient';
import { Room } from '../types';
import { Loader } from 'lucide-react';

interface RoomSelectorProps {
  value: string;
  onChange: (roomId: string) => void;
  disabled?: boolean;
}

const RoomSelector: React.FC<RoomSelectorProps> = ({ value, onChange, disabled }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Loader size={16} className="animate-spin" />
        <span className="text-sm">Loading rooms...</span>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-100"
      required
    >
      <option value="">-- Select a Room --</option>
      {rooms.map((room) => (
        <option key={room.id} value={room.id}>
          {room.name} (Capacity: {room.capacity})
        </option>
      ))}
    </select>
  );
};

export default RoomSelector;
