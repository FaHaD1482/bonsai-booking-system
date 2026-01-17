import { Booking, Room } from '../types';

export const generateWhatsAppMessage = (booking: Booking, room: Room): string => {
  const checkInDate = new Date(booking.check_in).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  
  const checkOutDate = new Date(booking.check_out).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const totalAmount = booking.price + booking.vat_amount;
  const payableOnArrival = booking.checkout_payable;

  const message = `Dear ${booking.guest_name},

Greetings from Bonsai Eco Village 🌿  
We are pleased to confirm your booking. Please review the details below for your reference:

---

*GUEST INFORMATION*
Name: ${booking.guest_name}  
Contact No: ${booking.guest_phone}  
Email: ${booking.guest_email || 'N/A'}  

---

*STAY DETAILS*
Check-In Date: ${checkInDate}  
Check-Out Date: ${checkOutDate}  
Check-In Time: ${booking.check_in_time || '2:00 PM'}  
Check-Out Time: ${booking.check_out_time || '12:00 PM'}  

Room: ${room.name}  
Number of Adults: ${booking.num_adults || booking.guest_count || 1}  
Booking Reference: ${booking.booking_no}  

---

*PAYMENT DETAILS*
• Base Amount: BDT ${booking.price.toFixed(2)}  
• VAT (2.5%): BDT ${booking.vat_amount.toFixed(2)}  
• Total Amount: BDT ${totalAmount.toFixed(2)}  
• Advance Paid: BDT ${booking.advance.toFixed(2)}  
• Remaining Payable on Arrival: BDT ${payableOnArrival.toFixed(2)}  

---

*CANCELLATION POLICY*
1. A minimum 15% cancellation charge applies if cancelled 7 days before check-in.  
2. 50% of total amount charged if cancelled between 7 days to 72 hours before check-in.  
3. 100% charge if cancelled within 72 hours prior to check-in.  

---

*SPECIAL REMARKS*
${booking.remarks || 'No special remarks'}

---

Thank you for choosing Bonsai Eco Village 🌱  
We look forward to welcoming you and ensuring you have a comfortable and memorable stay with us.

For any assistance or special requests, please feel free to contact us anytime.

Warm regards,  
Bonsai Eco Village Team 🌿`;

  return message;
};

export const sendWhatsAppMessage = async (
  phoneNumber: string,
  message: string,
  apiKey?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Format phone number - ensure it has country code
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('88')) {
      formattedPhone = '88' + formattedPhone;
    }

    // Note: This requires WhatsApp Business API integration
    // You can use services like:
    // 1. Twilio WhatsApp API
    // 2. WhatsApp Business API
    // 3. Green API
    // 4. WhatsApp Cloud API (Meta)

    // For now, returning a placeholder response
    // In production, integrate with your chosen service
    
    console.log(`📱 WhatsApp Message to: +${formattedPhone}`);
    console.log(`Message:\n${message}`);

    // Example: If using Twilio
    // const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages.json', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //   },
    //   body: new URLSearchParams({
    //     From: `whatsapp:${TWILIO_PHONE}`,
    //     To: `whatsapp:+${formattedPhone}`,
    //     Body: message,
    //   }),
    // });

    return {
      success: true,
      message: `WhatsApp message sent to +${formattedPhone}. Please configure WhatsApp API in settings.`
    };
  } catch (error) {
    console.error('❌ Failed to send WhatsApp message:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send message'
    };
  }
};

export const copyToClipboard = (text: string): boolean => {
  try {
    navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};
