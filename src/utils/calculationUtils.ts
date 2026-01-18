import { Booking, RefundPolicy } from '../types';

// VAT Calculation (2.5%)
export const calculateVAT = (price: number, isApplicable: boolean): number => {
  if (!isApplicable) return 0;
  return Math.round(price * 0.025 * 100) / 100; // Round to 2 decimals
};

// Total Price = Price + VAT
export const calculateTotalPrice = (price: number, vat: number): number => {
  return Math.round((price + vat) * 100) / 100;
};

// Checkout Payable = Total Price - Advance
export const calculateCheckoutPayable = (
  totalPrice: number,
  advance: number
): number => {
  return Math.round((totalPrice - advance) * 100) / 100;
};

// Calculate refund based on cancellation policy
export const calculateRefund = (
  bookingPrice: number,
  checkInDate: string,
  advancePaid: number,
  customRefund?: number
): { refundAmount: number; policy: string } => {
  // If custom refund is provided, use it
  if (customRefund !== undefined && customRefund !== null) {
    return {
      refundAmount: Math.round(customRefund * 100) / 100,
      policy: 'Custom refund amount - Based on guest negotiation'
    };
  }

  const checkIn = new Date(checkInDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  checkIn.setHours(0, 0, 0, 0);

  const daysUntilCheckIn = Math.ceil(
    (checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let refundPercentage = 0;
  let policy = '';

  if (daysUntilCheckIn <= 0) {
    // Cancelled on or after check-in date
    refundPercentage = 0;
    policy = '100% charge - Cancelled within 72 hours to check-in date';
  } else if (daysUntilCheckIn <= 3) {
    // Cancelled within 72 hours
    refundPercentage = 0;
    policy = '100% charge - Cancelled within 72 hours to check-in date';
  } else if (daysUntilCheckIn < 7) {
    // Cancelled between 3-7 days
    refundPercentage = 50;
    policy = '50% refund - Cancelled between 7 days to 72 hours';
  } else {
    // Cancelled 7+ days before
    refundPercentage = 85;
    policy = '85% refund - Cancelled 7 days before check-in';
  }

  const refundAmount = Math.round(
    (advancePaid * refundPercentage) / 100 * 100
  ) / 100;

  return { refundAmount, policy };
};

// Get refund policy description
export const getRefundPolicyText = (): string => {
  return `
CANCELLATION & REFUND POLICY
============================

1. PREMIUM CANCELLATION (7+ Days Before Check-In)
   - Refund: 85% of advance paid
   - Reason: Allows property to rebook the room

2. STANDARD CANCELLATION (7 Days to 72 Hours Before Check-In)
   - Refund: 50% of advance paid
   - Reason: Limited time to rebook; partial recovery

3. LATE CANCELLATION (Within 72 Hours to Check-In)
   - Refund: 0% (100% charge applies)
   - Reason: No time to rebook; operational costs incurred

SPECIAL CASES:
- No-show: Full charge applies
- Emergency cancellation: Contact management for review
- Refunds processed within 5-7 business days
  `;
};

// Format currency
export const formatCurrency = (amount: number, currency: string = 'BDT'): string => {
  return `${currency} ${amount.toFixed(2)}`;
};

// Format date to readable string
export const formatBookingDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Generate booking reference number
export const generateBookingReference = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `BK-${timestamp}-${random}`;
};

// Calculate stay duration in nights
export const calculateNights = (checkIn: string, checkOut: string): number => {
  const check_in = new Date(checkIn);
  const check_out = new Date(checkOut);
  const nights = Math.ceil(
    (check_out.getTime() - check_in.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(nights, 1);
};

// Validate phone number format
export const validatePhoneNumber = (phone: string): boolean => {
  // Bangladesh phone numbers: +880, 0, or no prefix; followed by 10 digits
  const phoneRegex = /^(\+?880|0)?1[3-9]\d{8}$/;
  const cleaned = phone.replace(/\s+/g, '');
  return phoneRegex.test(cleaned);
};

// Validate email format
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format phone number to standard format
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('880')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    return `+880${cleaned.slice(1)}`;
  } else if (cleaned.length === 10) {
    return `+880${cleaned}`;
  }
  return phone;
};

// Export data to CSV
export const exportToCSV = (
  data: any[],
  filename: string,
  columns: { key: string; label: string }[]
): void => {
  const headers = columns.map((col) => col.label).join(',');
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col.key];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
