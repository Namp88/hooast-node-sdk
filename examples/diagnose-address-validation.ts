import { CryptoUtils } from '../src/utils/crypto.utils';
import { bech32 } from 'bech32';

/**
 * Diagnostic tool for address validation issues
 * Helps understand why certain addresses are being rejected
 */
async function diagnoseAddressValidation() {
  console.log('🔍 Hoosat Address Validation Diagnostics\n');

  // Test addresses that are causing issues
  const testAddresses = ['hoosat:qz7ulu6pwqeq6kxpup85fzuukwx7v5z6zs5xspm0ka', 'hoosat:qq8xdv4n9tqjwxqj8z3pum2q7x6yv2zr5mxwpmdvqh'];

  // Generate a fresh address for comparison
  const generatedWallet = CryptoUtils.generateKeyPair();
  testAddresses.unshift(generatedWallet.address);

  console.log('📊 Generated fresh address for comparison:');
  console.log(`   ${generatedWallet.address}\n`);

  testAddresses.forEach((address, index) => {
    console.log(`🧪 Analyzing address ${index + 1}: ${address}`);
    console.log('─'.repeat(60));

    // Basic checks
    console.log(`   Length: ${address.length} characters`);
    console.log(`   Starts with 'hoosat:': ${address.startsWith('hoosat:')}`);

    try {
      // Try bech32 decode
      const decoded = bech32.decode(address);
      console.log(`   ✅ Bech32 decode successful:`);
      console.log(`      Prefix: "${decoded.prefix}"`);
      console.log(`      Words count: ${decoded.words.length}`);
      console.log(`      Words: ${decoded.words.slice(0, 5).join(', ')}${decoded.words.length > 5 ? '...' : ''}`);

      try {
        // Try to convert words to bytes
        const bytes = bech32.fromWords(decoded.words);
        console.log(`   ✅ Word conversion successful:`);
        console.log(`      Byte length: ${bytes.length}`);
        console.log(`      Bytes (hex): ${Buffer.from(bytes).toString('hex').slice(0, 20)}${bytes.length > 10 ? '...' : ''}`);

        // Check expected length
        if (bytes.length === 20) {
          console.log(`   ✅ Standard P2PKH length (20 bytes)`);
        } else {
          console.log(`   ⚠️  Non-standard length: ${bytes.length} bytes (expected 20)`);
        }
      } catch (conversionError) {
        console.log(`   ❌ Word to byte conversion failed: ${conversionError.message}`);
      }
    } catch (decodeError) {
      console.log(`   ❌ Bech32 decode failed: ${decodeError.message}`);
    }

    // Test with our validation function
    const isValid = CryptoUtils.isValidAddress(address);
    console.log(`   🎯 Our validation result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

    // If we have permissive validation, test that too
    if (typeof CryptoUtils.isValidAddressPermissive === 'function') {
      const isValidPermissive = CryptoUtils.isValidAddressPermissive(address);
      console.log(`   🎯 Permissive validation: ${isValidPermissive ? '✅ VALID' : '❌ INVALID'}`);
    }

    console.log(''); // Empty line for readability
  });

  // Test address generation process step by step
  console.log('🔧 Address Generation Process Analysis:');
  console.log('─'.repeat(60));

  const wallet = CryptoUtils.generateKeyPair();
  console.log(`1. Generated private key: ${wallet.privateKey.toString('hex').slice(0, 16)}...`);
  console.log(`2. Derived public key: ${wallet.publicKey.toString('hex')}`);

  // Show the address creation process
  try {
    const pubKeyHash = CryptoUtils.blake3Hash(wallet.publicKey).slice(0, 20);
    console.log(`3. Public key hash (Blake3, 20 bytes): ${pubKeyHash.toString('hex')}`);

    const words = bech32.toWords(pubKeyHash);
    console.log(`4. Converted to bech32 words: ${words.length} words`);

    const address = bech32.encode('hoosat', words);
    console.log(`5. Final address: ${address}`);

    const matches = address === wallet.address;
    console.log(`6. Matches generated address: ${matches ? '✅ YES' : '❌ NO'}`);

    if (!matches) {
      console.log(`   Generated: ${wallet.address}`);
      console.log(`   Manual:    ${address}`);
    }
  } catch (error) {
    console.log(`❌ Manual address generation failed: ${error.message}`);
  }

  console.log('\n🔍 Recommendations:');

  if (testAddresses.some(addr => !CryptoUtils.isValidAddress(addr))) {
    console.log('   • Some addresses are being rejected by validation');
    console.log('   • Check if the validation is too strict for address length');
    console.log('   • Consider using permissive validation for testing');
    console.log('   • Verify that the bech32 implementation matches Hoosat specs');
  } else {
    console.log('   • All test addresses passed validation ✅');
    console.log('   • Address validation appears to be working correctly');
  }

  console.log('   • Compare with known working Hoosat addresses from the network');
  console.log('   • Check Hoosat node source code for exact address format requirements');
}

// Quick test for specific address
async function quickAddressTest(address: string) {
  console.log(`🧪 Quick test for: ${address}\n`);

  try {
    const decoded = bech32.decode(address);
    const bytes = bech32.fromWords(decoded.words);

    console.log(`Prefix: ${decoded.prefix}`);
    console.log(`Byte length: ${bytes.length}`);
    console.log(`Validation result: ${CryptoUtils.isValidAddress(address) ? 'VALID' : 'INVALID'}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

// Export functions
export { diagnoseAddressValidation, quickAddressTest };

// Run if called directly
if (require.main === module) {
  const address = process.argv[2];

  if (address) {
    quickAddressTest(address);
  } else {
    diagnoseAddressValidation();
  }
}
