import { useEffect } from 'react';
import supabase from '../services/supabaseClient';
import { Booking } from '../types';

export const useSyncToSheets = () => {
  useEffect(() => {
    let subscription: any;

    const setupSubscription = async () => {
      try {
        // Using Supabase realtime API v2
        subscription = supabase
          .channel('bookings-realtime')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'bookings',
            },
            (payload: any) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                syncBookingToSheet(payload.new as Booking);
              }
            }
          )
          .subscribe();
      } catch (error) {
        console.error('Failed to setup realtime subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);
};

const syncBookingToSheet = async (booking: Booking) => {
  try {
    const response = await fetch('/api/sync-to-sheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ booking }),
    });

    if (!response.ok) {
      console.warn('Failed to sync to Google Sheets:', response.statusText);
      return;
    }

    console.log('✅ Booking synced to Google Sheets:', booking.id);
  } catch (error) {
    console.log('Sheet sync info:', error instanceof Error ? error.message : 'Sync skipped (may be local dev)');
  }
};
