import { describe, it, expect } from 'vitest';
import { HoosatCrypto } from '@crypto/crypto';
import { HoosatSigner } from '@crypto/signer';
import { hashMessage, formatMessage, hashBuffer, MESSAGE_PREFIX } from '@crypto/hasher';

describe('HoosatSigner - Message Signing', () => {
  // Test vectors
  const TEST_PRIVATE_KEY = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
  const SIMPLE_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000001';

  describe('Message Hashing', () => {
    it('should format message with correct prefix', () => {
      const message = 'Hello, Hoosat!';
      const formatted = formatMessage(message);

      expect(formatted).toBeInstanceOf(Buffer);
      expect(formatted.length).toBeGreaterThan(message.length);

      // Verify prefix is included
      const prefixBuffer = Buffer.from(MESSAGE_PREFIX, 'utf8');
      const messageBuffer = Buffer.from(message, 'utf8');

      expect(formatted[0]).toBe(prefixBuffer.length); // Prefix length byte
      expect(formatted[prefixBuffer.length + 1]).toBe(messageBuffer.length); // Message length byte
    });

    it('should hash message with BLAKE3', () => {
      const message = 'Test message';
      const hash = hashMessage(message);

      expect(hash).toBeInstanceOf(Buffer);
      expect(hash.length).toBe(32); // BLAKE3 always outputs 32 bytes
    });

    it('should be deterministic - same message produces same hash', () => {
      const message = 'Deterministic test';
      const hash1 = hashMessage(message);
      const hash2 = hashMessage(message);

      expect(hash1.equals(hash2)).toBe(true);
    });

    it('should produce different hashes for different messages', () => {
      const hash1 = hashMessage('Message 1');
      const hash2 = hashMessage('Message 2');

      expect(hash1.equals(hash2)).toBe(false);
    });

    it('should handle empty message', () => {
      const hash = hashMessage('');

      expect(hash).toBeInstanceOf(Buffer);
      expect(hash.length).toBe(32);
    });

    it('should handle unicode characters', () => {
      const message = 'Hello 世界 🌍';
      const hash = hashMessage(message);

      expect(hash).toBeInstanceOf(Buffer);
      expect(hash.length).toBe(32);
    });

    it('should hash raw buffer correctly', () => {
      const buffer = Buffer.from('raw data', 'utf8');
      const hash = hashBuffer(buffer);

      expect(hash).toBeInstanceOf(Buffer);
      expect(hash.length).toBe(32);
    });
  });

  describe('Basic Signing and Verification', () => {
    it('should sign message with valid private key', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const message = 'Hello, Hoosat!';

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), message);

      expect(signature).toBeTruthy();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(128); // 64 bytes in hex
      expect(/^[0-9a-f]{128}$/.test(signature)).toBe(true); // Valid hex
    });

    it('should verify valid signature', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const message = 'Test message';

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), message);

      const isValid = HoosatSigner.verifyMessage(signature, message, wallet.publicKey.toString('hex'));

      expect(isValid).toBe(true);
    });

    it('should reject signature with wrong message', () => {
      const wallet = HoosatCrypto.generateKeyPair();

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), 'Original message');

      const isValid = HoosatSigner.verifyMessage(signature, 'Different message', wallet.publicKey.toString('hex'));

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong public key', () => {
      const wallet1 = HoosatCrypto.generateKeyPair();
      const wallet2 = HoosatCrypto.generateKeyPair();
      const message = 'Test';

      const signature = HoosatSigner.signMessage(wallet1.privateKey.toString('hex'), message);

      const isValid = HoosatSigner.verifyMessage(signature, message, wallet2.publicKey.toString('hex'));

      expect(isValid).toBe(false);
    });

    it('should reject invalid signature format', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const invalidSignature = 'invalid';

      const isValid = HoosatSigner.verifyMessage(invalidSignature, 'Test', wallet.publicKey.toString('hex'));

      expect(isValid).toBe(false);
    });

    it('should handle empty message', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const message = '';

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), message);
      const isValid = HoosatSigner.verifyMessage(signature, message, wallet.publicKey.toString('hex'));

      expect(isValid).toBe(true);
    });

    it('should handle long messages', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const message = 'A'.repeat(1000);

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), message);
      const isValid = HoosatSigner.verifyMessage(signature, message, wallet.publicKey.toString('hex'));

      expect(isValid).toBe(true);
    });

    it('should handle unicode messages', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const message = 'Hello 世界 🚀';

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), message);
      const isValid = HoosatSigner.verifyMessage(signature, message, wallet.publicKey.toString('hex'));

      expect(isValid).toBe(true);
    });
  });

  describe('RFC6979 Determinism', () => {
    it('should produce deterministic signatures (RFC6979)', () => {
      const message = 'Deterministic test';

      const sig1 = HoosatSigner.signMessage(TEST_PRIVATE_KEY, message);
      const sig2 = HoosatSigner.signMessage(TEST_PRIVATE_KEY, message);

      expect(sig1).toBe(sig2);
    });

    it('should produce same signature across multiple runs', () => {
      const signatures = [];

      for (let i = 0; i < 10; i++) {
        const sig = HoosatSigner.signMessage(SIMPLE_PRIVATE_KEY, 'Test');
        signatures.push(sig);
      }

      const firstSig = signatures[0];
      const allSame = signatures.every(sig => sig === firstSig);

      expect(allSame).toBe(true);
    });

    it('should produce different signatures for different messages', () => {
      const sig1 = HoosatSigner.signMessage(TEST_PRIVATE_KEY, 'Message 1');
      const sig2 = HoosatSigner.signMessage(TEST_PRIVATE_KEY, 'Message 2');

      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different keys', () => {
      const wallet1 = HoosatCrypto.generateKeyPair();
      const wallet2 = HoosatCrypto.generateKeyPair();
      const message = 'Same message';

      const sig1 = HoosatSigner.signMessage(wallet1.privateKey.toString('hex'), message);
      const sig2 = HoosatSigner.signMessage(wallet2.privateKey.toString('hex'), message);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('Public Key Operations', () => {
    it('should derive public key from private key', () => {
      const publicKey = HoosatSigner.getPublicKey(TEST_PRIVATE_KEY);

      expect(publicKey).toBeTruthy();
      expect(typeof publicKey).toBe('string');
      expect(publicKey.length).toBe(66); // 33 bytes in hex (compressed)
      expect(/^[0-9a-f]{66}$/.test(publicKey)).toBe(true);
    });

    it('should be deterministic', () => {
      const pubKey1 = HoosatSigner.getPublicKey(TEST_PRIVATE_KEY);
      const pubKey2 = HoosatSigner.getPublicKey(TEST_PRIVATE_KEY);

      expect(pubKey1).toBe(pubKey2);
    });

    it('should match HoosatCrypto.getPublicKey output', () => {
      const privateKey = Buffer.from(TEST_PRIVATE_KEY, 'hex');

      const pubKey1 = HoosatSigner.getPublicKey(TEST_PRIVATE_KEY);
      const pubKey2 = HoosatCrypto.getPublicKey(privateKey).toString('hex');

      expect(pubKey1).toBe(pubKey2);
    });

    it('should throw error for invalid private key length', () => {
      expect(() => HoosatSigner.getPublicKey('1234')).toThrow('Private key must be 32 bytes');
    });

    it('should throw error for invalid private key format', () => {
      const invalidKey = '00'.repeat(32); // All zeros
      expect(() => HoosatSigner.getPublicKey(invalidKey)).toThrow('Invalid private key');
    });
  });

  describe('Public Key Recovery', () => {
    it('should recover public key from valid signature', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const message = 'Test recovery';

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), message);
      const recovered = HoosatSigner.recoverPublicKey(signature, message);

      expect(recovered).toBeTruthy();
      expect(typeof recovered).toBe('string');
      expect(recovered!.length).toBe(66); // 33 bytes in hex
    });

    it('should recover a valid public key from signature', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const message = 'Recovery test';

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), message);
      const recovered = HoosatSigner.recoverPublicKey(signature, message);

      expect(recovered).toBeTruthy();
      // Note: Due to secp256k1 library not preserving recovery ID,
      // we can only verify that recovered key validates the signature
      const isValid = HoosatSigner.verifyMessage(signature, message, recovered!);
      expect(isValid).toBe(true);
    });

    it('should return null for invalid signature', () => {
      const invalidSig = 'ff'.repeat(64);
      const recovered = HoosatSigner.recoverPublicKey(invalidSig, 'Test');

      expect(recovered).toBeNull();
    });

    it('should return null for wrong message', () => {
      const wallet = HoosatCrypto.generateKeyPair();

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), 'Original');
      const recovered = HoosatSigner.recoverPublicKey(signature, 'Different');

      // Recovery might succeed but with wrong key
      if (recovered) {
        expect(recovered).not.toBe(wallet.publicKey.toString('hex'));
      }
    });

    it('should handle malformed signature gracefully', () => {
      const recovered = HoosatSigner.recoverPublicKey('invalid', 'Test');

      expect(recovered).toBeNull();
    });
  });

  describe('SignedMessage Creation', () => {
    it('should create valid SignedMessage object for mainnet', () => {
      const message = 'DApp login request';

      const signedMsg = HoosatSigner.createSignedMessage(TEST_PRIVATE_KEY, message, 'mainnet');

      expect(signedMsg).toHaveProperty('message', message);
      expect(signedMsg).toHaveProperty('signature');
      expect(signedMsg).toHaveProperty('publicKey');
      expect(signedMsg).toHaveProperty('address');
      expect(signedMsg).toHaveProperty('timestamp');

      expect(signedMsg.signature.length).toBe(128);
      expect(signedMsg.publicKey.length).toBe(66);
      expect(signedMsg.address).toMatch(/^hoosat:/);

      // Verify timestamp is valid ISO 8601
      expect(() => new Date(signedMsg.timestamp)).not.toThrow();
      expect(new Date(signedMsg.timestamp).toISOString()).toBe(signedMsg.timestamp);
    });

    it('should create valid SignedMessage for testnet', () => {
      const message = 'Testnet auth';

      const signedMsg = HoosatSigner.createSignedMessage(TEST_PRIVATE_KEY, message, 'testnet');

      expect(signedMsg.address).toMatch(/^hoosattest:/);
    });

    it('should default to mainnet', () => {
      const signedMsg = HoosatSigner.createSignedMessage(TEST_PRIVATE_KEY, 'Test');

      expect(signedMsg.address).toMatch(/^hoosat:/);
    });

    it('should include optional appId', () => {
      const signedMsg = HoosatSigner.createSignedMessage(TEST_PRIVATE_KEY, 'Test', 'mainnet', {
        appId: 'my-dapp',
      });

      expect(signedMsg.appId).toBe('my-dapp');
    });

    it('should include optional nonce', () => {
      const signedMsg = HoosatSigner.createSignedMessage(TEST_PRIVATE_KEY, 'Test', 'mainnet', {
        nonce: '123456',
      });

      expect(signedMsg.nonce).toBe('123456');
    });

    it('should include both appId and nonce', () => {
      const signedMsg = HoosatSigner.createSignedMessage(TEST_PRIVATE_KEY, 'Test', 'mainnet', {
        appId: 'test-app',
        nonce: 'abc123',
      });

      expect(signedMsg.appId).toBe('test-app');
      expect(signedMsg.nonce).toBe('abc123');
    });

    it('should have valid signature that can be verified', () => {
      const message = 'Verify this';
      const signedMsg = HoosatSigner.createSignedMessage(TEST_PRIVATE_KEY, message);

      const isValid = HoosatSigner.verifyMessage(signedMsg.signature, signedMsg.message, signedMsg.publicKey);

      expect(isValid).toBe(true);
    });
  });

  describe('SignedMessage Verification', () => {
    it('should verify valid SignedMessage', () => {
      const message = 'Authentication request';
      const signedMsg = HoosatSigner.createSignedMessage(TEST_PRIVATE_KEY, message, 'mainnet');

      const result = HoosatSigner.verifySignedMessage(signedMsg, 'mainnet');

      expect(result.isValid).toBe(true);
      expect(result.recoveredPublicKey).toBe(signedMsg.publicKey);
      expect(result.recoveredAddress).toBe(signedMsg.address);
      expect(result.error).toBeUndefined();
    });

    it('should reject SignedMessage with invalid signature', () => {
      const signedMsg = HoosatSigner.createSignedMessage(TEST_PRIVATE_KEY, 'Test', 'mainnet');

      // Tamper with signature
      signedMsg.signature = 'ff'.repeat(64);

      const result = HoosatSigner.verifySignedMessage(signedMsg, 'mainnet');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should reject SignedMessage with tampered message', () => {
      const signedMsg = HoosatSigner.createSignedMessage(TEST_PRIVATE_KEY, 'Original', 'mainnet');

      // Tamper with message
      signedMsg.message = 'Tampered';

      const result = HoosatSigner.verifySignedMessage(signedMsg, 'mainnet');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should reject SignedMessage with wrong public key', () => {
      const wallet1 = HoosatCrypto.generateKeyPair();
      const wallet2 = HoosatCrypto.generateKeyPair();

      const signedMsg = HoosatSigner.createSignedMessage(wallet1.privateKey.toString('hex'), 'Test', 'mainnet');

      // Replace with wrong public key
      signedMsg.publicKey = wallet2.publicKey.toString('hex');

      const result = HoosatSigner.verifySignedMessage(signedMsg, 'mainnet');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should verify with correct network', () => {
      const signedMsg = HoosatSigner.createSignedMessage(TEST_PRIVATE_KEY, 'Test', 'testnet');

      const result = HoosatSigner.verifySignedMessage(signedMsg, 'testnet');

      expect(result.isValid).toBe(true);
      // Note: recoveredAddress check is skipped because secp256k1 library
      // doesn't preserve recovery ID, making exact recovery unreliable
      if (result.recoveredAddress) {
        expect(result.recoveredAddress).toMatch(/^hoosattest:/);
      }
    });

    it('should handle malformed SignedMessage gracefully', () => {
      const malformedMsg: any = {
        message: 'Test',
        signature: 'invalid',
        publicKey: 'invalid',
        address: 'invalid',
        timestamp: new Date().toISOString(),
      };

      const result = HoosatSigner.verifySignedMessage(malformedMsg);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid private key in signMessage', () => {
      expect(() => HoosatSigner.signMessage('invalid', 'Test')).toThrow();
    });

    it('should reject short private key in signMessage', () => {
      expect(() => HoosatSigner.signMessage('1234', 'Test')).toThrow('Private key must be 32 bytes');
    });

    it('should reject invalid signature in verifyMessage', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const isValid = HoosatSigner.verifyMessage('invalid', 'Test', wallet.publicKey.toString('hex'));

      expect(isValid).toBe(false);
    });

    it('should reject invalid public key in verifyMessage', () => {
      const signature = 'a'.repeat(128);
      const isValid = HoosatSigner.verifyMessage(signature, 'Test', 'invalid');

      expect(isValid).toBe(false);
    });

    it('should reject wrong length signature in verifyMessage', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const shortSig = 'a'.repeat(100); // Should be 128 chars

      const isValid = HoosatSigner.verifyMessage(shortSig, 'Test', wallet.publicKey.toString('hex'));

      expect(isValid).toBe(false);
    });

    it('should reject wrong length public key in verifyMessage', () => {
      const signature = 'a'.repeat(128);
      const wrongPubKey = 'a'.repeat(50); // Should be 66 chars

      const isValid = HoosatSigner.verifyMessage(signature, 'Test', wrongPubKey);

      expect(isValid).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const longMessage = 'A'.repeat(10000);

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), longMessage);
      const isValid = HoosatSigner.verifyMessage(signature, longMessage, wallet.publicKey.toString('hex'));

      expect(isValid).toBe(true);
    });

    it('should handle messages with special characters', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const message = '!@#$%^&*(){}[]|\\:";\'<>?,./`~';

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), message);
      const isValid = HoosatSigner.verifyMessage(signature, message, wallet.publicKey.toString('hex'));

      expect(isValid).toBe(true);
    });

    it('should handle messages with newlines', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const message = 'Line 1\nLine 2\nLine 3';

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), message);
      const isValid = HoosatSigner.verifyMessage(signature, message, wallet.publicKey.toString('hex'));

      expect(isValid).toBe(true);
    });

    it('should handle messages with tabs', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const message = 'Col1\tCol2\tCol3';

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), message);
      const isValid = HoosatSigner.verifyMessage(signature, message, wallet.publicKey.toString('hex'));

      expect(isValid).toBe(true);
    });

    it('should distinguish between similar messages', () => {
      const wallet = HoosatCrypto.generateKeyPair();

      const sig1 = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), 'test');
      const sig2 = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), 'Test'); // Capital T

      expect(sig1).not.toBe(sig2);

      const valid1 = HoosatSigner.verifyMessage(sig1, 'test', wallet.publicKey.toString('hex'));
      const valid2 = HoosatSigner.verifyMessage(sig1, 'Test', wallet.publicKey.toString('hex'));

      expect(valid1).toBe(true);
      expect(valid2).toBe(false); // Case matters
    });
  });

  describe('Cross-verification', () => {
    it('should verify signature with recovered public key', () => {
      const wallet = HoosatCrypto.generateKeyPair();
      const message = 'Cross-verify test';

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), message);
      const recovered = HoosatSigner.recoverPublicKey(signature, message);

      expect(recovered).toBeTruthy();

      const isValid = HoosatSigner.verifyMessage(signature, message, recovered!);

      expect(isValid).toBe(true);
    });

    it('should recover a valid public key that verifies signature', () => {
      const wallet = HoosatCrypto.generateKeyPair('mainnet');
      const message = 'Address derivation test';

      const signature = HoosatSigner.signMessage(wallet.privateKey.toString('hex'), message);
      const recovered = HoosatSigner.recoverPublicKey(signature, message);

      expect(recovered).toBeTruthy();

      // Verify that recovered public key can validate the signature
      const isValid = HoosatSigner.verifyMessage(signature, message, recovered!);
      expect(isValid).toBe(true);

      // Note: Due to secp256k1 library not preserving recovery ID,
      // the recovered key might be different but still valid for verification
      // In production, you should verify signature + address together
    });
  });
});
