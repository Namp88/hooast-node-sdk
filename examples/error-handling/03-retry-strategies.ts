/**
 * Example: Retry Strategies for Robustness
 *
 * Demonstrates:
 * - Exponential backoff
 * - Circuit breaker pattern
 * - Retry with jitter
 * - Conditional retries (retry only on certain errors)
 * - Maximum retry limits
 *
 * Prerequisites:
 * - Access to Hoosat node (for real examples)
 *
 * Use case:
 * - Building resilient production applications
 * - Handling transient network failures
 * - Preventing system overload
 * - Graceful degradation
 *
 * 💡 Best Practices:
 * - Don't retry on permanent failures (invalid address, insufficient balance)
 * - Use exponential backoff to prevent server overload
 * - Implement circuit breaker to fail fast during outages
 * - Add jitter to prevent thundering herd
 */

// ==================== UTILITY FUNCTIONS ====================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add random jitter to prevent thundering herd
 */
function jitter(ms: number, maxJitter = 1000): number {
  return ms + Math.random() * maxJitter;
}

// ==================== RETRY STRATEGIES ====================

/**
 * Strategy 1: Simple Retry with Fixed Delay
 */
async function simpleRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${maxRetries}...`);
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`  ❌ Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        console.log(`  ⏳ Waiting ${delay}ms before retry...\n`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Strategy 2: Exponential Backoff
 */
async function exponentialBackoff<T>(fn: () => Promise<T>, maxRetries = 5, baseDelay = 1000, maxDelay = 30000): Promise<T> {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${maxRetries}...`);
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`  ❌ Attempt ${attempt} failed`);

      if (attempt < maxRetries) {
        // Exponential: 1s, 2s, 4s, 8s, 16s, ...
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        console.log(`  ⏳ Waiting ${delay}ms before retry (exponential backoff)...\n`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Strategy 3: Exponential Backoff with Jitter
 */
async function exponentialBackoffWithJitter<T>(fn: () => Promise<T>, maxRetries = 5, baseDelay = 1000, maxDelay = 30000): Promise<T> {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${maxRetries}...`);
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`  ❌ Attempt ${attempt} failed`);

      if (attempt < maxRetries) {
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        const delayWithJitter = jitter(exponentialDelay, 1000);
        console.log(`  ⏳ Waiting ${Math.round(delayWithJitter)}ms (exponential + jitter)...\n`);
        await sleep(delayWithJitter);
      }
    }
  }

  throw lastError;
}

/**
 * Strategy 4: Conditional Retry (only retry on specific errors)
 */
async function conditionalRetry<T>(fn: () => Promise<T>, shouldRetry: (error: any) => boolean, maxRetries = 3, delay = 2000): Promise<T> {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${maxRetries}...`);
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`  ❌ Attempt ${attempt} failed`);

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        console.log(`  🛑 Error not retryable, failing immediately`);
        throw error;
      }

      if (attempt < maxRetries) {
        console.log(`  ⏳ Retryable error, waiting ${delay}ms...\n`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Strategy 5: Circuit Breaker
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold = 5,
    private resetTimeout = 60000 // 60 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should reset to HALF_OPEN
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        console.log('  🔄 Circuit breaker: OPEN → HALF_OPEN (testing)');
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - failing fast');
      }
    }

    try {
      const result = await fn();

      // Success - reset circuit
      if (this.state === 'HALF_OPEN') {
        console.log('  ✅ Circuit breaker: HALF_OPEN → CLOSED (recovered)');
        this.state = 'CLOSED';
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      console.log(`  ⚠️  Circuit breaker: ${this.failures}/${this.failureThreshold} failures`);

      if (this.failures >= this.failureThreshold) {
        console.log('  🚫 Circuit breaker: CLOSED → OPEN (too many failures)');
        this.state = 'OPEN';
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}

// ==================== MAIN EXAMPLES ====================

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   🔄 RETRY STRATEGIES');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== EXAMPLE 1: SIMPLE RETRY ====================
  console.log('1️⃣  Strategy: Simple Retry (Fixed Delay)');
  console.log('═════════════════════════════════════════════════════════════');
  console.log('Use case: Basic retry for transient failures\n');

  let attemptCount = 0;
  const unreliableFunction = async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error('Temporary failure');
    }
    return 'Success!';
  };

  try {
    const result = await simpleRetry(unreliableFunction, 3, 500);
    console.log(`  ✅ Success: ${result}\n`);
  } catch (error) {
    console.log(`  ❌ All retries failed\n`);
  }

  // ==================== EXAMPLE 2: EXPONENTIAL BACKOFF ====================
  console.log('2️⃣  Strategy: Exponential Backoff');
  console.log('═════════════════════════════════════════════════════════════');
  console.log('Use case: Prevent server overload, gradually increase wait time\n');

  attemptCount = 0;
  const slowRecovery = async () => {
    attemptCount++;
    if (attemptCount < 4) {
      throw new Error('Server overloaded');
    }
    return 'Success!';
  };

  try {
    const result = await exponentialBackoff(slowRecovery, 5, 1000, 10000);
    console.log(`  ✅ Success: ${result}\n`);
  } catch (error) {
    console.log(`  ❌ All retries failed\n`);
  }

  // ==================== EXAMPLE 3: EXPONENTIAL BACKOFF WITH JITTER ====================
  console.log('3️⃣  Strategy: Exponential Backoff + Jitter');
  console.log('═════════════════════════════════════════════════════════════');
  console.log('Use case: Prevent thundering herd (many clients retrying at same time)\n');

  console.log('  Simulating with jitter to randomize retry times...\n');

  // Demonstrate jitter
  console.log('  Without jitter: all clients retry at exactly 1s, 2s, 4s');
  console.log('  With jitter:    clients retry at random times around those marks\n');

  for (let i = 0; i < 3; i++) {
    const baseDelay = 1000 * Math.pow(2, i);
    const withJitter = jitter(baseDelay, 500);
    console.log(`  Retry ${i + 1}: ${baseDelay}ms → ${Math.round(withJitter)}ms (with jitter)`);
  }
  console.log();

  // ==================== EXAMPLE 4: CONDITIONAL RETRY ====================
  console.log('4️⃣  Strategy: Conditional Retry (Smart Retries)');
  console.log('═════════════════════════════════════════════════════════════');
  console.log('Use case: Only retry on transient errors, fail fast on permanent errors\n');

  // Define which errors are retryable
  const isRetryableError = (error: any): boolean => {
    const errorStr = error.toString();

    // Retryable (transient network issues)
    if (errorStr.includes('timeout')) return true;
    if (errorStr.includes('ECONNREFUSED')) return true;
    if (errorStr.includes('ECONNRESET')) return true;
    if (errorStr.includes('ETIMEDOUT')) return true;

    // Not retryable (permanent failures)
    if (errorStr.includes('insufficient')) return false;
    if (errorStr.includes('invalid address')) return false;
    if (errorStr.includes('spam')) return false;

    return false; // Default: don't retry unknown errors
  };

  // Test with retryable error
  console.log('  Test 1: Retryable error (timeout)');
  attemptCount = 0;
  const transientError = async () => {
    attemptCount++;
    if (attemptCount < 2) {
      throw new Error('Connection timeout');
    }
    return 'Success!';
  };

  try {
    const result = await conditionalRetry(transientError, isRetryableError, 3, 1000);
    console.log(`  ✅ Success: ${result}\n`);
  } catch (error) {
    console.log(`  ❌ Failed after retries\n`);
  }

  // Test with permanent error
  console.log('  Test 2: Non-retryable error (invalid address)');
  const permanentError = async () => {
    throw new Error('Invalid address format');
  };

  try {
    await conditionalRetry(permanentError, isRetryableError, 3, 1000);
  } catch (error: any) {
    console.log(`  ✅ Failed fast (no retries): ${error.message}\n`);
  }

  // ==================== EXAMPLE 5: CIRCUIT BREAKER ====================
  console.log('5️⃣  Strategy: Circuit Breaker');
  console.log('═════════════════════════════════════════════════════════════');
  console.log('Use case: Prevent cascading failures, fail fast during outages\n');

  const breaker = new CircuitBreaker(3, 5000); // Open after 3 failures, reset after 5s

  const unreliableService = async () => {
    // Simulate 80% failure rate
    if (Math.random() < 0.8) {
      throw new Error('Service unavailable');
    }
    return 'Success!';
  };

  console.log('  Sending requests through circuit breaker...\n');

  for (let i = 1; i <= 10; i++) {
    try {
      console.log(`  Request ${i}:`);
      const result = await breaker.execute(unreliableService);
      console.log(`    ✅ ${result}`);
    } catch (error: any) {
      console.log(`    ❌ ${error.message}`);
    }

    console.log(`    State: ${breaker.getState()}\n`);

    // Stop if circuit opens
    if (breaker.getState() === 'OPEN' && i === 5) {
      console.log('  Circuit opened! Waiting for reset timeout...\n');
      await sleep(5500); // Wait for circuit to reset
      console.log('  Attempting request after reset timeout...\n');
    }
  }

  // ==================== REAL-WORLD EXAMPLE ====================
  console.log('6️⃣  Real-World Example: Robust Node Connection');
  console.log('═════════════════════════════════════════════════════════════\n');

  console.log('Complete production-ready connection function:\n');

  console.log('```typescript');
  console.log('async function connectToNodeWithRetry(');
  console.log('  host: string,');
  console.log('  port: number');
  console.log('): Promise<HoosatNode> {');
  console.log('  const isRetryable = (error: any): boolean => {');
  console.log('    const err = error.toString();');
  console.log('    return err.includes("timeout") || ');
  console.log('           err.includes("ECONNREFUSED") ||');
  console.log('           err.includes("ECONNRESET");');
  console.log('  };');
  console.log('');
  console.log('  return exponentialBackoffWithJitter(async () => {');
  console.log('    const node = new HoosatNode({ host, port, timeout: 10000 });');
  console.log('    const info = await node.getInfo();');
  console.log('    ');
  console.log('    if (!info.ok) {');
  console.log('      // Check if retryable');
  console.log('      if (!isRetryable(info.error)) {');
  console.log('        throw new Error(`Permanent failure: ${info.error}`);');
  console.log('      }');
  console.log('      throw new Error(info.error);');
  console.log('    }');
  console.log('    ');
  console.log('    return node;');
  console.log('  }, 5, 1000, 30000);');
  console.log('}');
  console.log('```\n');

  // ==================== BEST PRACTICES ====================
  console.log('7️⃣  Best Practices Summary');
  console.log('═════════════════════════════════════════════════════════════\n');

  console.log('When to use each strategy:\n');

  console.log('Simple Retry:');
  console.log('  ✅ Quick transient failures');
  console.log('  ✅ Low-traffic scenarios');
  console.log('  ❌ High-load systems\n');

  console.log('Exponential Backoff:');
  console.log('  ✅ Server overload scenarios');
  console.log('  ✅ Rate-limited APIs');
  console.log('  ✅ Production systems\n');

  console.log('Exponential Backoff + Jitter:');
  console.log('  ✅ Multiple clients (prevent thundering herd)');
  console.log('  ✅ Distributed systems');
  console.log('  ✅ Best for production\n');

  console.log('Conditional Retry:');
  console.log('  ✅ Mix of transient and permanent errors');
  console.log('  ✅ Fail fast on user errors');
  console.log('  ✅ Save resources\n');

  console.log('Circuit Breaker:');
  console.log('  ✅ Prevent cascading failures');
  console.log('  ✅ Microservices architecture');
  console.log('  ✅ Critical production systems\n');

  // ==================== DECISION TREE ====================
  console.log('8️⃣  Decision Tree');
  console.log('═════════════════════════════════════════════════════════════\n');

  console.log('How to choose:');
  console.log('  1. Is error permanent? → No retry, fail immediately');
  console.log('  2. Is this a simple script? → Simple retry');
  console.log('  3. Is this production code? → Exponential backoff + jitter');
  console.log('  4. Multiple clients? → Add jitter');
  console.log('  5. Critical service? → Add circuit breaker\n');

  // ==================== SUMMARY ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ✅ RETRY STRATEGIES COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Key Takeaways:');
  console.log("  ✅ Don't retry permanent failures (saves time/resources)");
  console.log('  ✅ Use exponential backoff to prevent server overload');
  console.log('  ✅ Add jitter to prevent thundering herd');
  console.log('  ✅ Implement circuit breaker for critical systems');
  console.log('  ✅ Log all retry attempts for debugging');
  console.log();
  console.log('💡 Production Recommendation:');
  console.log('   Exponential Backoff + Jitter + Circuit Breaker');
  console.log('   This combination handles most scenarios gracefully.');
  console.log();
}

// Run example
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
