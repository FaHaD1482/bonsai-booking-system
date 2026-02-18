import { Booking } from '../types';
import html2pdf from 'html2pdf.js';
import logo from '../assets/bonsai.png';

/**
 * Generate and download an invoice for a booking using Tailwind CSS
 * DRY Principle: Centralized invoice generation logic
 */
export const generateInvoicePDF = (booking: Booking, roomName?: string) => {
  // Validate booking is checked out
  if (booking.status !== 'Checked-out') {
    console.error('Only checked-out bookings can have invoices generated');
    return;
  }

  // Calculate totals
  const baseAmount = booking.price;
  const vatAmount = booking.vat_amount || 0;
  const extraIncome = booking.extra_income || 0;
  const discount = booking.discount || 0;
  const subtotal = baseAmount + vatAmount;
  const totalAmount = subtotal + extraIncome - discount;
  const advancePaid = booking.advance || 0;
  const remainingPayment = totalAmount - advancePaid;

  // Format dates
  const checkInDate = new Date(booking.check_in).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const checkOutDate = new Date(booking.check_out).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const invoiceDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Calculate nights
  const checkInObj = new Date(booking.check_in);
  const checkOutObj = new Date(booking.check_out);
  const nights = Math.ceil(
    (checkOutObj.getTime() - checkInObj.getTime()) / (1000 * 60 * 60 * 24)
  );

  const pricePerNight = nights > 0 ? (baseAmount / nights).toFixed(2) : '0.00';

  // Build itemized rows HTML
  let itemizedRows = `
    <tr class="border-b">
      <td class="py-3 px-4">${roomName || 'Room'} — ${nights} nights @ ৳${pricePerNight}/night</td>
      <td class="py-3 px-4 text-right">${nights}</td>
      <td class="py-3 px-4 text-right">৳${pricePerNight}</td>
      <td class="py-3 px-4 text-right font-semibold text-green-600">৳${baseAmount.toFixed(2)}</td>
    </tr>
  `;

  if (vatAmount > 0) {
    itemizedRows += `
    <tr class="border-b bg-gray-50">
      <td class="py-3 px-4">VAT</td>
      <td class="py-3 px-4 text-right">1</td>
      <td class="py-3 px-4 text-right">-</td>
      <td class="py-3 px-4 text-right font-semibold text-green-600">৳${vatAmount.toFixed(2)}</td>
    </tr>
    `;
  }

  if (extraIncome > 0) {
    itemizedRows += `
    <tr class="border-b">
      <td class="py-3 px-4">Additional Costs</td>
      <td class="py-3 px-4 text-right">1</td>
      <td class="py-3 px-4 text-right">-</td>
      <td class="py-3 px-4 text-right font-semibold text-green-600">৳${extraIncome.toFixed(2)}</td>
    </tr>
    `;
  }

  if (discount > 0) {
    itemizedRows += `
    <tr class="border-b bg-gray-50">
      <td class="py-3 px-4">Discount</td>
      <td class="py-3 px-4 text-right">1</td>
      <td class="py-3 px-4 text-right">-</td>
      <td class="py-3 px-4 text-right font-semibold text-red-600">-৳${discount.toFixed(2)}</td>
    </tr>
    `;
  }

  // Build summary rows
  let summaryRows = `
    <div class="flex justify-between py-2 text-sm">
      <span class="text-gray-600">Subtotal (Base + VAT)</span>
      <span class="font-medium">৳${subtotal.toFixed(2)}</span>
    </div>
  `;

  if (extraIncome > 0) {
    summaryRows += `
    <div class="flex justify-between py-2 text-sm">
      <span class="text-gray-600">Additional Costs</span>
      <span class="font-medium">৳${extraIncome.toFixed(2)}</span>
    </div>
    `;
  }

  if (discount > 0) {
    summaryRows += `
    <div class="flex justify-between py-2 text-sm">
      <span class="text-gray-600">Discount</span>
      <span class="font-medium text-red-600">-৳${discount.toFixed(2)}</span>
    </div>
    `;
  }

  summaryRows += `
    <div class="flex justify-between py-4 mt-4 border-t-2 border-green-500 text-lg font-bold text-green-600">
      <span>TOTAL AMOUNT</span>
      <span>৳${totalAmount.toFixed(2)}</span>
    </div>
    <div class="flex justify-between py-2 text-sm">
      <span class="text-gray-600">Advance Paid</span>
      <span class="font-medium">৳${advancePaid.toFixed(2)}</span>
    </div>
    <div class="flex justify-between py-2 text-sm font-medium">
      <span class="text-gray-700">Amount Paid</span>
      <span>৳${totalAmount.toFixed(2)}</span>
    </div>
  `;

  // Full HTML with Tailwind CDN
const invoiceHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Invoice</title>

<style>
@page {
  size: A4;
  margin: 12mm 10mm;
}

body {
  font-family: Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  color: #1f2937;
}

.page-wrapper {
  position: relative;
  min-height: 277mm; /* A4 usable height */
  padding-bottom: 30mm; /* space reserved for footer */
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 0;
  border-bottom: 2px solid #e5e7eb;
  text-align: left;
}

td {
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.amount-column {
  text-align: right;
  min-width: 90px;
}

.summary-row td {
  border-bottom: none;
  padding: 6px 0;
}

.total-highlight {
  font-weight: 700;
  font-size: 15px;
}

.due-highlight {
  font-weight: 700;
  font-size: 15px;
  color: #dc2626;
}

.logo {
  height: 75px;
  width: auto;
  margin-bottom: 8px;
}

.footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
  justify-content: center;
}
</style>
</head>

<body>
<div class="max-w-[190mm] mx-auto page-wrapper">

  <!-- Header -->
  <div class="flex justify-between items-start mb-8">
    <div>
      <img src="${logo}" class="logo"/>
      <div class="text-gray-600 text-xs leading-relaxed mt-2">
        <b>Phone No.</b> +880 1806-973000<br>
        <b>Email:</b> bonsai.ecovillage@gmail.com<br>
        info@bonsaiecovillage.com
      </div>
    </div>

    <div class="text-right">
      <div class="text-2xl font-bold text-gray-800">INVOICE</div>
      <div class="text-sm text-gray-600 mt-2">
        No: ${booking.booking_no || '—'}<br>
        Date: ${invoiceDate}
      </div>
    </div>
  </div>

  <!-- Guest & Stay Info -->
  <div class="flex justify-between text-sm mb-8">
    <div>
      <div class="uppercase text-gray-500 text-xs font-medium mb-1">Billed to</div>
      <div class="font-medium">${booking.guest_name || '—'}</div>
      <div class="text-gray-600">${booking.guest_phone || ''}</div>
    </div>

    <div class="text-right leading-relaxed">
      <div><span class="text-gray-500">Check-in:</span> ${checkInDate}</div>
      <div><span class="text-gray-500">Check-out:</span> ${checkOutDate}</div>
      <div><span class="text-gray-500">Nights:</span> ${nights}</div>
      <div><span class="text-gray-500">Room:</span> ${roomName || '—'}</div>
    </div>
  </div>

  <!-- Single Table -->
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="amount-column">Qty</th>
        <th class="amount-column">Rate</th>
        <th class="amount-column">Amount</th>
      </tr>
    </thead>

    <tbody>
      ${itemizedRows}

      <!-- Spacer -->
      <tr>
        <td colspan="4" style="height:18px;border:none;"></td>
      </tr>

      <!-- Summary -->
      <tr class="summary-row">
        <td colspan="3" class="text-right text-gray-600 font-medium">Subtotal</td>
        <td class="amount-column">৳${subtotal.toFixed(2)}</td>
      </tr>

      ${extraIncome > 0 ? `
      <tr class="summary-row">
        <td colspan="3" class="text-right text-gray-600 font-medium">Additional Charges</td>
        <td class="amount-column">৳${extraIncome.toFixed(2)}</td>
      </tr>` : ''}

      ${discount > 0 ? `
      <tr class="summary-row">
        <td colspan="3" class="text-right text-red-600 font-medium">Discount</td>
        <td class="amount-column text-red-600">-৳${discount.toFixed(2)}</td>
      </tr>` : ''}

      <tr class="summary-row total-highlight">
        <td colspan="3" class="text-right border-t border-gray-400 pt-3">Total Amount</td>
        <td class="amount-column border-t border-gray-400 pt-3">
          ৳${totalAmount.toFixed(2)}
        </td>
      </tr>

      <tr class="summary-row">
        <td colspan="3" class="text-right text-gray-600 font-medium">Advance Paid</td>
        <td class="amount-column">৳${advancePaid.toFixed(2)}</td>
      </tr>

      <tr class="summary-row due-highlight">
        <td colspan="3" class="text-right border-t border-gray-400 pt-3">Amount Due</td>
        <td class="amount-column border-t border-gray-400 pt-3">
          ৳${Math.max(0, totalAmount - advancePaid).toFixed(2)}
        </td>
      </tr>

      <!-- Proper spacing row -->
      <tr>
        <td colspan="4" style="height:14px;border:none;"></td>
      </tr>

      <!-- Fully Paid Row -->
      <tr class="summary-row total-highlight">
        <td colspan="3"
            class="text-right pt-4 pb-4 border-t-2 border-green-400 font-semibold"
            style="background:#ecfdf5;">
          Total Paid Amount
        </td>
        <td class="amount-column pt-4 pb-4 border-t-2 border-green-400 font-semibold"
            style="background:#ecfdf5;">
          ৳ ${totalAmount.toFixed(2)}
        </td>
      </tr>

    </tbody>
  </table>

  <!-- Footer (Always bottom) -->
  <div class="footer mb-2">
    Thank you for visiting Bonsai Eco Village.<br><br>
  </div>

</div>
</body>
</html>
`;

  // Create temporary container
  const element = document.createElement('div');
  element.innerHTML = invoiceHTML;

  // PDF options
  const options: any = {
    margin: [8, 8, 8, 8],
    filename: `Invoice-${booking.booking_no || booking.id}-${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      logging: false,
      windowWidth: 794, // ≈ A4 at 96dpi
      windowHeight: 1123,
    },
    jsPDF: { 
      orientation: 'portrait', 
      unit: 'mm', 
      format: 'a4', 
      compress: true 
    },
  };

  // Generate and download PDF
  try {
    html2pdf()
      .set(options)
      .from(element)
      .save();
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw new Error('Failed to generate invoice. Please try again.');
  }
};