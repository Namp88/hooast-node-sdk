/**
 * Example: Parse payment URIs from scanned QR codes
 */
import { HoosatQR, HoosatUtils } from '../../src';

async function parsePaymentURIs() {
  console.log('🔍 Parsing Hoosat Payment URIs\n');

  // ==================== 1. Simple Address ====================
  console.log('1️⃣ Simple address URI:');
  const simpleURI = 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';

  try {
    const parsed1 = HoosatQR.parsePaymentURI(simpleURI);
    console.log('✅ Parsed successfully:');
    console.log('   Address:', parsed1.address);
    console.log('   Amount:', parsed1.amount || 'Not specified');
    console.log('   Label:', parsed1.label || 'Not specified');
    console.log('   Message:', parsed1.message || 'Not specified');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  console.log('');

  // ==================== 2. Payment with Amount ====================
  console.log('2️⃣ Payment with amount:');
  const paymentURI = 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu?amount=100';

  try {
    const parsed2 = HoosatQR.parsePaymentURI(paymentURI);
    console.log('✅ Parsed successfully:');
    console.log('   Address:', parsed2.address);
    console.log('   Amount (sompi):', parsed2.amount);
    console.log('   Amount (HTN):', HoosatUtils.sompiToAmount(parsed2.amount!));
    console.log('   Amount (formatted):', HoosatUtils.formatAmount(parsed2.amount!));
  } catch (error) {
    console.error('❌ Error:', error);
  }
  console.log('');

  // ==================== 3. Full Payment Request ====================
  console.log('3️⃣ Full payment request:');
  const fullURI =
    'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu?amount=50&label=Coffee%20Shop&message=Order%20%2312345';

  try {
    const parsed3 = HoosatQR.parsePaymentURI(fullURI);
    console.log('✅ Parsed successfully:');
    console.log('   Address:', parsed3.address);
    console.log('   Amount:', HoosatUtils.formatAmount(parsed3.amount!));
    console.log('   Label:', parsed3.label);
    console.log('   Message:', parsed3.message);
    console.log('   Raw URI:', parsed3.rawUri);
  } catch (error) {
    console.error('❌ Error:', error);
  }
  console.log('');

  // ==================== 4. Validation ====================
  console.log('4️⃣ URI Validation:');

  const validURIs = [
    'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu',
    'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu?amount=100',
    'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu?amount=50&label=Test',
  ];

  const invalidURIs = ['bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'hoosat:invalid_address', 'not_a_uri', 'hoosat:qz7ulu?amount=-50'];

  console.log('Valid URIs:');
  validURIs.forEach(uri => {
    const isValid = HoosatQR.isValidPaymentURI(uri);
    console.log(`   ${isValid ? '✅' : '❌'} ${uri.substring(0, 50)}...`);
  });

  console.log('\nInvalid URIs:');
  invalidURIs.forEach(uri => {
    const isValid = HoosatQR.isValidPaymentURI(uri);
    console.log(`   ${isValid ? '✅' : '❌'} ${uri}`);
  });
  console.log('');

  // ==================== 5. Practical Example: Process Scanned QR ====================
  console.log('5️⃣ Practical Example - Process Scanned QR:\n');

  const scannedQR =
    'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu?amount=25.5&label=Restaurant&message=Table%2015%20-%20Dinner';

  console.log('User scanned QR from mobile wallet:');
  console.log(scannedQR);
  console.log('');

  try {
    const payment = HoosatQR.parsePaymentURI(scannedQR);

    console.log('📱 Payment Request Details:');
    console.log('━'.repeat(60));
    console.log(`   Recipient: ${payment.label || 'Unknown'}`);
    console.log(`   Amount:    ${HoosatUtils.formatAmount(payment.amount!)} HTN`);
    console.log(`   Message:   ${payment.message || 'No message'}`);
    console.log(`   Address:   ${payment.address}`);
    console.log('━'.repeat(60));
    console.log('');

    // Simulate user confirmation
    console.log('✅ Ready to send transaction!');
    console.log(`   To:     ${payment.address}`);
    console.log(`   Amount: ${payment.amount} sompi`);
    console.log(`   Note:   ${payment.message}`);
  } catch (error) {
    console.error('❌ Error parsing QR:', error);
  }

  // ==================== 6. Build and Parse Round-Trip ====================
  console.log('\n6️⃣ Build & Parse Round-Trip Test:\n');

  const originalParams = {
    address: 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu',
    amount: 123.45,
    label: 'Test Merchant',
    message: 'Order #99999',
  };

  console.log('Original parameters:');
  console.log(originalParams);
  console.log('');

  // Build URI
  const builtURI = HoosatQR.buildPaymentURI(originalParams);
  console.log('Built URI:');
  console.log(builtURI);
  console.log('');

  // Parse it back
  const parsedBack = HoosatQR.parsePaymentURI(builtURI);
  console.log('Parsed back:');
  console.log({
    address: parsedBack.address,
    amount: HoosatUtils.sompiToAmount(parsedBack.amount!),
    label: parsedBack.label,
    message: parsedBack.message,
  });
  console.log('');

  // Verify
  const amountMatch = parseFloat(HoosatUtils.sompiToAmount(parsedBack.amount!)) === originalParams.amount;
  const labelMatch = parsedBack.label === originalParams.label;
  const messageMatch = parsedBack.message === originalParams.message;

  console.log('Verification:');
  console.log(`   Address: ✅`);
  console.log(`   Amount:  ${amountMatch ? '✅' : '❌'}`);
  console.log(`   Label:   ${labelMatch ? '✅' : '❌'}`);
  console.log(`   Message: ${messageMatch ? '✅' : '❌'}`);
}

// Run example
parsePaymentURIs();
