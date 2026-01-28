-- SQL Migration: Add pending_amount and revenue columns to bookings table
-- Phase: Database Schema Update
-- Date: 2026-01-20

-- Add pending_amount column
-- Definition: Amount pending at time of booking/checkout
-- Formula: pending_amount = price - advance (initially)
-- After checkout: pending_amount = 0
ALTER TABLE public.bookings
ADD COLUMN pending_amount numeric DEFAULT 0;

-- Add revenue column  
-- Definition: Calculated revenue from the booking
-- Formula: revenue = advance + vat_amount - refund_amount
-- Updated on: checkout, refund, or any status change
ALTER TABLE public.bookings
ADD COLUMN revenue numeric DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX idx_bookings_pending_amount ON public.bookings(pending_amount);
CREATE INDEX idx_bookings_revenue ON public.bookings(revenue);

-- Optional: Update existing bookings to calculate these values
-- UPDATE public.bookings
-- SET pending_amount = CASE 
--       WHEN status = 'Checked-out' THEN 0
--       WHEN status = 'Cancelled' THEN 0
--       ELSE price - advance
--     END,
--     revenue = advance + vat_amount - refund_amount;
