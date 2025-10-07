import * as fs from 'fs';
import { HoosatQR } from '../../src';

/**
 * Example: Generate QR codes for Hoosat addresses
 */

const EXAMPLE_ADDRESS = 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';

async function generateAddressQR() {
  console.log('🎨 Generating QR Codes for Hoosat Address\n');

  try {
    // ==================== 1. Simple Address QR (Data URL) ====================
    console.log('1️⃣ Generating simple address QR (Data URL)...');

    const dataURL = await HoosatQR.generateAddressQR(EXAMPLE_ADDRESS);
    console.log('✅ Data URL generated (for HTML <img> tag):');
    console.log(dataURL.substring(0, 100) + '...\n');

    // Save to HTML file for viewing
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Hoosat Address QR Code</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 50px;
      background: #f5f5f5;
    }
    .qr-container {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h2 { color: #333; }
    .address {
      font-family: monospace;
      font-size: 12px;
      color: #666;
      word-break: break-all;
      max-width: 300px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="qr-container">
    <h2>Scan to send HTN</h2>
    <img src="${dataURL}" alt="Hoosat Address QR Code" />
    <div class="address">${EXAMPLE_ADDRESS}</div>
  </div>
</body>
</html>
    `;

    fs.writeFileSync('address-qr.html', html);
    console.log('💾 Saved to: address-qr.html (open in browser)\n');

    // ==================== 2. High Quality QR (PNG Buffer) ====================
    console.log('2️⃣ Generating high-quality PNG...');

    const buffer = await HoosatQR.generateQRBuffer(EXAMPLE_ADDRESS, {
      width: 800,
      errorCorrectionLevel: 'H',
      margin: 4,
    });

    fs.writeFileSync('address-qr.png', buffer);
    console.log('✅ Saved to: address-qr.png\n');

    // ==================== 3. SVG Format ====================
    console.log('3️⃣ Generating SVG...');

    const svg = await HoosatQR.generateQRSVG(EXAMPLE_ADDRESS, {
      width: 500,
      color: {
        dark: '#0066cc',
        light: '#ffffff',
      },
    });

    fs.writeFileSync('address-qr.svg', svg);
    console.log('✅ Saved to: address-qr.svg\n');

    // ==================== 4. Terminal QR (CLI) ====================
    console.log('4️⃣ Terminal QR Code:\n');

    const terminalQR = await HoosatQR.generateQRTerminal(EXAMPLE_ADDRESS);
    console.log(terminalQR);
    console.log('Scan this with your mobile wallet! 📱\n');

    // ==================== 5. Custom Styled QR ====================
    console.log('5️⃣ Generating custom styled QR...');

    const customQR = await HoosatQR.generateAddressQR(EXAMPLE_ADDRESS, {
      width: 600,
      errorCorrectionLevel: 'H',
      margin: 3,
      color: {
        dark: '#4a1d96', // Purple
        light: '#f0e6ff', // Light purple
      },
    });

    const customHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Custom Styled Hoosat QR</title>
  <style>
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      font-family: Arial, sans-serif;
    }
    .card {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    h1 {
      color: #4a1d96;
      margin: 0 0 10px 0;
    }
    .subtitle {
      color: #888;
      margin-bottom: 30px;
    }
    img {
      border-radius: 10px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Send HTN</h1>
    <div class="subtitle">Scan with Hoosat Wallet</div>
    <img src="${customQR}" alt="Hoosat QR" />
  </div>
</body>
</html>
    `;

    fs.writeFileSync('custom-qr.html', customHtml);
    console.log('✅ Saved to: custom-qr.html\n');

    console.log('🎉 All QR codes generated successfully!');
    console.log('\n📂 Generated files:');
    console.log('   - address-qr.html (simple)');
    console.log('   - address-qr.png (high quality)');
    console.log('   - address-qr.svg (vector)');
    console.log('   - custom-qr.html (styled)');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run example
generateAddressQR();
