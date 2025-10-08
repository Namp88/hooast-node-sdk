/**
 * Example: Handling Network Errors
 *
 * Demonstrates:
 * - Connection timeout handling
 * - Node offline/unreachable scenarios
 * - Network configuration errors
 * - Graceful degradation
 * - User-friendly error messages
 *
 * Prerequisites:
 * - None (demonstrates error scenarios)
 *
 * Use case:
 * - Building robust production applications
 * - Handling unreliable network conditions
 * - Providing good UX during errors
 *
 * 💡 Best Practices:
 * - Always check result.ok before accessing result.result
 * - Provide specific error messages for different scenarios
 * - Implement retry logic for transient failures
 * - Log errors for debugging
 */
import { HoosatClient } from 'hoosat-sdk';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   🔌 NETWORK ERROR HANDLING');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== SCENARIO 1: CONNECTION TIMEOUT ====================
  console.log('1️⃣  Scenario: Connection Timeout');
  console.log('═════════════════════════════════════');
  console.log('Simulating slow/unresponsive node...\n');

  const slowClient = new HoosatClient({
    host: '54.38.176.95',
    port: 42420,
    timeout: 100, // Very short timeout to trigger error
  });

  try {
    const result = await slowClient.getInfo();

    if (!result.ok) {
      console.log('❌ Connection failed (expected)');
      console.log(`   Error: ${result.error}\n`);

      // Check specific error type
      if (result.error!.includes('timeout') || result.error!.includes('DEADLINE_EXCEEDED')) {
        console.log('💡 Timeout detected - possible solutions:');
        console.log('   1. Increase timeout value (default: 10000ms)');
        console.log('   2. Check network connection');
        console.log('   3. Verify node is responsive');
        console.log('   4. Try different node');
        console.log();
      }
    } else {
      console.log('⚠️  Connection succeeded (short timeout was enough)');
      console.log('   This may happen with very fast nodes\n');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  slowClient.disconnect();

  // ==================== SCENARIO 2: NODE OFFLINE ====================
  console.log('2️⃣  Scenario: Node Offline/Unreachable');
  console.log('═════════════════════════════════════');
  console.log('Attempting to connect to non-existent node...\n');

  const offlineClient = new HoosatClient({
    host: '192.168.255.255', // Non-routable IP
    port: 99999,
    timeout: 2000,
  });

  try {
    const result = await offlineClient.getInfo();

    if (!result.ok) {
      console.log('❌ Connection failed (expected)');
      console.log(`   Error: ${result.error}\n`);

      if (result.error!.includes('ECONNREFUSED') || result.error!.includes('ENOTFOUND')) {
        console.log('💡 Connection refused - possible causes:');
        console.log('   1. Node is not running');
        console.log('   2. Firewall blocking connection');
        console.log('   3. Wrong host or port');
        console.log('   4. Network issues');
        console.log();
        console.log('   Verify with: netstat -an | grep 42420');
        console.log();
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  offlineClient.disconnect();

  // ==================== SCENARIO 3: WRONG PORT ====================
  console.log('3️⃣  Scenario: Wrong Port Configuration');
  console.log('═════════════════════════════════════');
  console.log('Attempting to connect to wrong port...\n');

  const wrongPortClient = new HoosatClient({
    host: '54.38.176.95',
    port: 12345, // Wrong port
    timeout: 3000,
  });

  try {
    const result = await wrongPortClient.getInfo();

    if (!result.ok) {
      console.log('❌ Connection failed (expected)');
      console.log(`   Error: ${result.error}\n`);

      console.log('💡 Wrong port - solutions:');
      console.log('   1. Check node configuration');
      console.log('   2. Default Hoosat port: 42420');
      console.log('   3. Testnet may use different port');
      console.log('   4. Verify with node logs');
      console.log();
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  wrongPortClient.disconnect();

  // ==================== SCENARIO 4: SUCCESSFUL CONNECTION ====================
  console.log('4️⃣  Scenario: Successful Connection');
  console.log('═════════════════════════════════════');
  console.log('Connecting to actual working node...\n');

  const workingClient = new HoosatClient({
    host: '54.38.176.95',
    port: 42420,
    timeout: 10000,
  });

  try {
    const result = await workingClient.getInfo();

    if (result.ok && result.result) {
      console.log('✅ Connection successful!');
      console.log(`   Server Version: ${result.result.serverVersion}`);
      console.log(`   Is Synced:      ${result.result.isSynced}`);
    } else {
      console.log('❌ Connection failed');
      console.log(`   Error: ${result.error}\n`);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  workingClient.disconnect();

  // ==================== PRODUCTION PATTERNS ====================
  console.log('5️⃣  Production-Ready Error Handling');
  console.log('═════════════════════════════════════\n');

  console.log('✅ Best Practices:\n');

  console.log('1. Always check result.ok:');
  console.log('```typescript');
  console.log('const result = await node.getInfo();');
  console.log('if (result.ok) {');
  console.log('  // Success: use result.result');
  console.log('  console.log(result.result.serverVersion);');
  console.log('} else {');
  console.log('  // Error: use result.error');
  console.log('  console.error(result.error);');
  console.log('}');
  console.log('```\n');

  console.log('2. Categorize errors:');
  console.log('```typescript');
  console.log('if (result.error.includes("timeout")) {');
  console.log('  // Handle timeout');
  console.log('} else if (result.error.includes("ECONNREFUSED")) {');
  console.log('  // Handle connection refused');
  console.log('} else if (result.error.includes("ENOTFOUND")) {');
  console.log('  // Handle DNS/host not found');
  console.log('}');
  console.log('```\n');

  console.log('3. User-friendly messages:');
  console.log('```typescript');
  console.log('function getUserMessage(error: string): string {');
  console.log('  if (error.includes("timeout")) {');
  console.log('    return "Node is slow to respond. Try again later.";');
  console.log('  }');
  console.log('  if (error.includes("ECONNREFUSED")) {');
  console.log('    return "Cannot reach node. Check your connection.";');
  console.log('  }');
  console.log('  return "Network error. Please try again.";');
  console.log('}');
  console.log('```\n');

  console.log('4. Connection health check:');
  console.log('```typescript');
  console.log('async function isNodeHealthy(node: HoosatNode): Promise<boolean> {');
  console.log('  const info = await node.getInfo();');
  console.log('  return info.ok && info.result?.isSynced === true;');
  console.log('}');
  console.log('```\n');

  // ==================== HELPER FUNCTIONS ====================
  console.log('6️⃣  Helper Functions');
  console.log('═════════════════════════════════════\n');

  console.log('Robust connection function:');
  console.log('```typescript');
  console.log('async function connectWithRetry(');
  console.log('  host: string,');
  console.log('  port: number,');
  console.log('  maxRetries = 3');
  console.log('): Promise<HoosatNode | null> {');
  console.log('  for (let i = 0; i < maxRetries; i++) {');
  console.log('    const node = new HoosatNode({ host, port, timeout: 5000 });');
  console.log('    const result = await node.getInfo();');
  console.log('    ');
  console.log('    if (result.ok) {');
  console.log('      console.log(`Connected on attempt ${i + 1}`);');
  console.log('      return node;');
  console.log('    }');
  console.log('    ');
  console.log('    console.log(`Attempt ${i + 1} failed, retrying...`);');
  console.log('    node.disconnect();');
  console.log('    await new Promise(r => setTimeout(r, 2000));');
  console.log('  }');
  console.log('  ');
  console.log('  return null;');
  console.log('}');
  console.log('```\n');

  // ==================== ERROR TYPES REFERENCE ====================
  console.log('7️⃣  Common Error Types Reference');
  console.log('═════════════════════════════════════\n');

  const errorTypes = [
    {
      error: 'DEADLINE_EXCEEDED',
      cause: 'Request timeout',
      solution: 'Increase timeout or check node performance',
    },
    {
      error: 'ECONNREFUSED',
      cause: 'Connection refused by server',
      solution: 'Verify node is running and port is correct',
    },
    {
      error: 'ENOTFOUND',
      cause: 'Host not found (DNS)',
      solution: 'Check host address spelling and network',
    },
    {
      error: 'ECONNRESET',
      cause: 'Connection reset by peer',
      solution: 'Network instability, retry connection',
    },
    {
      error: 'ETIMEDOUT',
      cause: 'Connection attempt timed out',
      solution: 'Check firewall, network, or increase timeout',
    },
    {
      error: 'EHOSTUNREACH',
      cause: 'Host unreachable',
      solution: 'Check network routing and connectivity',
    },
  ];

  console.log('Error Type          | Cause                       | Solution');
  console.log('--------------------|-----------------------------|---------------------------------');
  errorTypes.forEach(({ error, cause, solution }) => {
    console.log(`${error.padEnd(19)} | ${cause.padEnd(27)} | ${solution}`);
  });
  console.log();

  // ==================== SUMMARY ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ✅ NETWORK ERROR HANDLING COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Key Takeaways:');
  console.log('  ✅ Always check result.ok before accessing data');
  console.log('  ✅ Provide specific error messages for different scenarios');
  console.log('  ✅ Implement retry logic for transient failures');
  console.log('  ✅ Use appropriate timeouts (default: 10000ms)');
  console.log('  ✅ Log errors for debugging and monitoring');
  console.log();
  console.log('💡 Next Steps:');
  console.log('   See 02-transaction-errors.ts for transaction-specific errors');
  console.log('   See 03-retry-strategies.ts for advanced retry patterns');
  console.log();
}

// Run example
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
