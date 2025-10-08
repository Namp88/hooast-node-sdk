import * as fs from 'fs';
import { HoosatQR } from 'hoosat-sdk';

/**
 * Example: Generate payment request QR codes with amount and metadata
 */

const MERCHANT_ADDRESS = 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';

async function generatePaymentQRs() {
  console.log('💰 Generating Payment Request QR Codes\n');

  try {
    // ==================== 1. Coffee Shop Payment ====================
    console.log('1️⃣ Coffee Shop - 5 HTN');

    const coffeeQR = await HoosatQR.generatePaymentQR({
      address: MERCHANT_ADDRESS,
      amount: 5,
      label: 'Coffee Shop',
      message: 'Cappuccino + Croissant',
    });

    const coffeeURI = HoosatQR.buildPaymentURI({
      address: MERCHANT_ADDRESS,
      amount: 5,
      label: 'Coffee Shop',
      message: 'Cappuccino + Croissant',
    });

    console.log('URI:', coffeeURI);
    console.log('✅ QR generated\n');

    // ==================== 2. Donation Request ====================
    console.log('2️⃣ Donation - 100 HTN');

    const donationQR = await HoosatQR.generatePaymentQR({
      address: MERCHANT_ADDRESS,
      amount: 100,
      label: 'Open Source Project',
      message: 'Support Hoosat SDK development ❤️',
    });

    const donationURI = HoosatQR.buildPaymentURI({
      address: MERCHANT_ADDRESS,
      amount: 100,
      label: 'Open Source Project',
      message: 'Support Hoosat SDK development ❤️',
    });

    console.log('URI:', donationURI);
    console.log('✅ QR generated\n');

    // ==================== 3. Invoice Payment ====================
    console.log('3️⃣ Invoice #12345 - 1,500 HTN');

    const invoiceQR = await HoosatQR.generatePaymentQR({
      address: MERCHANT_ADDRESS,
      amount: 1500,
      label: 'Company Ltd',
      message: 'Invoice #12345 - Web Development Services',
    });

    const invoiceURI = HoosatQR.buildPaymentURI({
      address: MERCHANT_ADDRESS,
      amount: 1500,
      label: 'Company Ltd',
      message: 'Invoice #12345 - Web Development Services',
    });

    console.log('URI:', invoiceURI);
    console.log('✅ QR generated\n');

    // ==================== 4. Create HTML Page with All QRs ====================
    console.log('4️⃣ Creating payment requests page...');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Hoosat Payment Requests</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      color: white;
      margin-bottom: 40px;
      font-size: 36px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
    }
    .payment-card {
      background: white;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
      transition: transform 0.3s;
    }
    .payment-card:hover {
      transform: translateY(-5px);
    }
    .payment-card h2 {
      color: #4a1d96;
      margin-bottom: 10px;
      font-size: 24px;
    }
    .amount {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      margin: 10px 0;
    }
    .message {
      color: #666;
      font-size: 14px;
      margin: 15px 0;
      min-height: 40px;
    }
    .qr-code {
      margin: 20px 0;
      border-radius: 10px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .uri {
      font-family: monospace;
      font-size: 10px;
      color: #999;
      word-break: break-all;
      margin-top: 15px;
      padding: 10px;
      background: #f8f8f8;
      border-radius: 5px;
    }
    .scan-text {
      color: #4a1d96;
      font-weight: bold;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>💸 Hoosat Payment Requests</h1>
    
    <div class="grid">
      <!-- Coffee Shop -->
      <div class="payment-card">
        <h2>☕ Coffee Shop</h2>
        <div class="amount">5 HTN</div>
        <div class="message">Cappuccino + Croissant</div>
        <img src="${coffeeQR}" alt="Coffee Payment QR" class="qr-code" />
        <div class="scan-text">Scan with Hoosat Wallet</div>
        <div class="uri">${coffeeURI}</div>
      </div>

      <!-- Donation -->
      <div class="payment-card">
        <h2>❤️ Open Source Donation</h2>
        <div class="amount">100 HTN</div>
        <div class="message">Support Hoosat SDK development</div>
        <img src="${donationQR}" alt="Donation QR" class="qr-code" />
        <div class="scan-text">Scan with Hoosat Wallet</div>
        <div class="uri">${donationURI}</div>
      </div>

      <!-- Invoice -->
      <div class="payment-card">
        <h2>📄 Invoice Payment</h2>
        <div class="amount">1,500 HTN</div>
        <div class="message">Invoice #12345 - Web Development Services</div>
        <img src="${invoiceQR}" alt="Invoice QR" class="qr-code" />
        <div class="scan-text">Scan with Hoosat Wallet</div>
        <div class="uri">${invoiceURI}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    fs.writeFileSync('payment-requests.html', html);
    console.log('✅ Saved to: payment-requests.html\n');

    // ==================== 5. Generate Individual PNG Files ====================
    console.log('5️⃣ Generating PNG files...');

    const coffeePNG = await HoosatQR.generateQRBuffer(coffeeURI, { width: 600 });
    fs.writeFileSync('coffee-payment.png', coffeePNG);
    console.log('✅ coffee-payment.png');

    const donationPNG = await HoosatQR.generateQRBuffer(donationURI, { width: 600 });
    fs.writeFileSync('donation-payment.png', donationPNG);
    console.log('✅ donation-payment.png');

    const invoicePNG = await HoosatQR.generateQRBuffer(invoiceURI, { width: 600 });
    fs.writeFileSync('invoice-payment.png', invoicePNG);
    console.log('✅ invoice-payment.png\n');

    console.log('🎉 All payment QR codes generated!');
    console.log('\n📂 Generated files:');
    console.log('   - payment-requests.html (interactive page)');
    console.log('   - coffee-payment.png');
    console.log('   - donation-payment.png');
    console.log('   - invoice-payment.png');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run example
generatePaymentQRs();
