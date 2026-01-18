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
        <img src="/assets/bonsai.png" alt="Bonsai Eco Village" className="mx-auto mb-4 w-25 h-20" />
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

      {/* Add Booking Form */}
      <section className="space-y-6 sm:space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Plus className="text-emerald-600 flex-shrink-0" size={24} />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Create New Booking</h2>
          </div>
          <div className="bg-white rounded-lg shadow-lg border border-emerald-100 p-6 sm:p-8">
            <BookingForm onBookingAdded={handleBookingAdded} />
          </div>
        </div>

        {/* All Bookings List */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">All Bookings</h2>
          <BookingList refresh={refresh} />
        </div>
      </section>
    </div>
  );
};

export default Bookings;













































































































































































































































































































































































**Status:** Ready for Implementation**Last Updated:** January 2026  ---**ROI:** Excellent - increases confirmations and reduces no-shows**Estimated Monthly Cost:** $0-10 depending on volume  **Estimated Setup Time:** 15-30 minutes  - **Can I customize the message?** Yes, edit `generateWhatsAppMessage()` function- **Will guests complain?** Unlikely - most prefer WhatsApp updates- **Is it secure?** Yes, WhatsApp uses end-to-end encryption- **Do I need credit card?** Not for trial, yes for production- **Can I test for free?** Yes! Twilio sandbox is completely free## Questions?---5. Update `BookingForm.tsx` to call the function after booking creation4. Implement API call in `sendWhatsAppMessage()` function3. Add credentials to `.env.local`2. Get credentials from provider1. Choose provider (recommend Twilio)## What You Need to Add✅ Logging for debugging  ✅ Error handling  ✅ Cancellation policy included  ✅ All booking details included  ✅ Currency formatting (BDT)  ✅ Phone number formatting  ✅ Professional message formatting  ## Features Already in Code---**Solution:** Check internet connection and that .env file is read correctly### Problem: "Provider error"**Solution:** Your trial account is sending too many messages. Upgrade to paid or wait 24 hours### Problem: "Rate limit exceeded"**Solution:** Check ACCOUNT_SID and AUTH_TOKEN are copied exactly, no spaces### Problem: "Authentication failed"**Solution:** Ensure phone number starts with country code (88 for Bangladesh)### Problem: "Invalid phone number"## Troubleshooting---- [ ] Deploy to Vercel (add env vars in Vercel dashboard)- [ ] Integrate into BookingForm component- [ ] Test with sample message- [ ] Update whatsappService.ts with API call code- [ ] Install axios if not already installed: `npm install axios`- [ ] Add credentials to `.env.local`- [ ] Create account and get credentials- [ ] Choose WhatsApp provider (Twilio recommended)## Integration Checklist---3. Update env variables in Vercel/hosting2. Upgrade Twilio account (add payment method)1. Add phone numbers to your verified callers listWhen ready for production:### Step 6: Deploy (Optional)- All future messages to your number are FREE in sandbox- Then your number is approved for testing- Message: `join code-word`Send a message to the Twilio sandbox number:### Step 5: Test Integration```VITE_TWILIO_WHATSAPP_NUMBER=+12025551234VITE_TWILIO_AUTH_TOKEN=auth_token_here_very_long_stringVITE_TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcd```Update `.env.local`:### Step 4: Add to Environment4. You'll get a sandbox WhatsApp number (e.g., +1 234 567 8900)3. Accept terms2. Click on "WhatsApp" tab1. In Console, go to "Messaging" → "Try it out" → "Send an SMS"### Step 3: Set Up WhatsApp   - **Auth Token** - copy this   - **Account SID** - copy this2. You'll see:1. After login, go to Console### Step 2: Get Trial Credentials4. Verify email3. Fill in details (name, email, password)2. Click "Sign Up"1. Visit [twilio.com](https://www.twilio.com/try-twilio)### Step 1: Create Account## Step-by-Step Setup (Twilio - Recommended)---**RECOMMENDATION:** Use Twilio for best value!- Meta WhatsApp: ~$5-10/month- Green API: ৳22,500/month (~$250)- Twilio: $3.75/month ✅ Still very cheap**Scenario 3: Large Resort (500 bookings/month)**- Meta WhatsApp: Free tier- Green API: ৳4,500/month (~$50)- Twilio: $0.75/month ✅ Negligible**Scenario 2: Medium Resort (100 bookings/month)**- Meta WhatsApp: Free tier- Green API: ৳450/month (~$5)- Twilio: $0.075/month ✅ Negligible**Scenario 1: Small Resort (10 bookings/month)**### Budget Scenarios## Cost Breakdown---```};  };    message: 'Message sent (simulated)',    success: true,  return {  // Simulate successful send    console.log(`Message:\n${message}`);  console.log(`📱 WhatsApp to: +${phoneNumber}`);) => {  message: string  phoneNumber: string,export const sendWhatsAppMessage = async (// For testing without real API```typescript### Option B: Use Simulator5. Test messages are completely FREE4. You'll receive sandbox number3. Send message: "join [code]" to Twilio WhatsApp number2. Go to WhatsApp Sandbox1. Create Twilio account### Option A: Use Twilio Sandbox (FREE - No Credit Card)## Testing the Integration---```};  }    console.error('Error:', error);  } catch (error) {    }      }        console.warn('Failed to send WhatsApp:', result.message);      } else {        console.log('Booking confirmation sent via WhatsApp ✓');      if (result.success) {            const result = await sendWhatsAppMessage(formData.guest_phone, message);      const message = generateWhatsAppMessage(booking, room);    if (room && formData.guest_phone) {    const room = rooms.find(r => r.id === formData.room_id);    // Generate and send WhatsApp message        // ... save booking to database ...  try {const handleAddBooking = async (formData: any) => {// After booking is createdimport { sendWhatsAppMessage, generateWhatsAppMessage } from '../services/whatsappService';```typescript## How to Use in BookingForm---```};  }    };      message: error instanceof Error ? error.message : 'Failed to send message',      success: false,    return {    console.error('WhatsApp error:', error);  } catch (error) {    };      messageId: response.data.sid,      message: 'WhatsApp message sent successfully',      success: true,    return {    );      }        },          password: TWILIO_AUTH_TOKEN,          username: TWILIO_ACCOUNT_SID,        auth: {      {      },        Body: message,        To: `whatsapp:+${formattedPhone}`,        From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,      {      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,    const response = await axios.post(    }      formattedPhone = '88' + formattedPhone.substring(1);    if (formattedPhone.startsWith('01')) {    // If using local format, convert to international        }      formattedPhone = '88' + formattedPhone;    if (!formattedPhone.startsWith('1') && !formattedPhone.startsWith('88')) {    let formattedPhone = phoneNumber.replace(/\D/g, '');    // Format phone number  try {): Promise<{ success: boolean; message: string; messageId?: string }> => {  message: string  phoneNumber: string,export const sendWhatsAppMessage = async (const TWILIO_WHATSAPP_NUMBER = import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER;const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN;const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID;import axios from 'axios';import { Booking, Room } from '../types';```typescriptHere's how to integrate Twilio (add to `src/services/whatsappService.ts`):## Implementation Code Example---   ```   VITE_GREEN_API_TOKEN=your_token   VITE_GREEN_API_INSTANCE_ID=your_instance_id   ```4. Create `.env` variables:3. Get API Token2. Sign up for account1. Go to [green-api.com](https://green-api.com)**Setup Steps:**- Less documentation than Twilio- Smaller company**Cons:**- Pay-per-month plan available- Good API documentation- Very fast integration- Cheapest option**Pros:****Setup Time:** 5 minutes**Cost:** ৳15-30 per 1,000 messages (extremely cheap!)  ### Option 3: **Green API** (Most affordable)---   ```   VITE_WHATSAPP_ACCESS_TOKEN=your_access_token   VITE_WHATSAPP_PHONE_NUMBER_ID=your_phone_id   VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id   ```6. Create `.env` variables:5. Generate access tokens4. Request WhatsApp Business API access3. Get Business Account ID2. Create business account1. Go to [developers.facebook.com](https://developers.facebook.com)**Setup Steps:**- Need business account- Requires business verification- Slightly more complex setup**Cons:**- Better long-term scalability- More professional appearance- Largest message volume allowance- Official Meta solution**Pros:****Setup Time:** 15-30 minutes**Cost:** Generally free for first 1,000 messages/month, then $0.0085 per message  ### Option 2: **Meta WhatsApp Cloud API** (Official - Best for large scale) ---   ```   VITE_TWILIO_WHATSAPP_NUMBER=+1234567890   VITE_TWILIO_AUTH_TOKEN=your_auth_token   VITE_TWILIO_ACCOUNT_SID=your_account_sid   ```5. Create `.env` variables:4. Get Account SID and Auth Token3. Get trial WhatsApp number (+1 sandbox number)2. Sign up for free account1. Go to [twilio.com](https://www.twilio.com)**Setup Steps:**- Monthly cost can add up- Pay-per-message model**Cons:**- Test number provided- Reliable delivery- Free trial with $15 credit- Good documentation- Easy setup and integration**Pros:****Setup Time:** 5-10 minutes**Cost:** Free tier available, then $0.0075 per message (approx. ৳0.75)  ### Option 1: **Twilio** (Recommended for beginners) ⭐## WhatsApp Service Provider Options---- Handles various input formats- Automatically formats numbers to international format (+880...)✅ **Phone Number Formatting**- Cancellation policy details- Contact information and special remarks included- Professional formatting with clear sections- Bonsai Eco Village branding (🌿, 🌱)✅ **Message Customization**- Handles all booking fields (phone, email, remarks, etc.)- Supports Bengali Taka (৳) currency formatting- Includes guest info, stay details, payment breakdown, cancellation policy- Automatically formats booking details into a professional message✅ **Booking Confirmation Message Generator** (`whatsappService.ts`)## What's Currently Implemented---The booking system includes a **WhatsApp Service** that automatically generates professional booking confirmation messages and sends them to guests' WhatsApp numbers. The feature is **IMPLEMENTED AND READY** - you just need to configure the API service.## Overviewimport BookingList from '../components/BookingList';
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
        <img src="/assets/bonsai.png" alt="Bonsai Eco Village" className="mx-auto mb-4 w-25 h-20" />
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

      {/* Add Booking Form */}
      <section className="space-y-6 sm:space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Plus className="text-emerald-600 flex-shrink-0" size={24} />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Create New Booking</h2>
          </div>
          <div className="bg-white rounded-lg shadow-lg border border-emerald-100 p-6 sm:p-8">
            <BookingForm onBookingAdded={handleBookingAdded} />
          </div>
        </div>

        {/* All Bookings List */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">All Bookings</h2>
          <BookingList refresh={refresh} />
        </div>
      </section>
    </div>
  );
};

export default Bookings;