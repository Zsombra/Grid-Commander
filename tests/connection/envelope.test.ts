import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createCipher } from '@/infrastructure/crypto/envelope.js';

const key = () => randomBytes(32).toString('base64');

describe('envelope encryption', () => {
  it('round-trips a token', () => {
    const c = createCipher(key());
    expect(c.decrypt(c.encrypt('bg_live_secret'))).toBe('bg_live_secret');
  });

  it('produces a different ciphertext each time, so equal tokens are not linkable', () => {
    const c = createCipher(key());
    expect(c.encrypt('same')).not.toBe(c.encrypt('same'));
  });

  it('refuses a tampered ciphertext rather than returning garbage', () => {
    const c = createCipher(key());
    const [iv, tag, data] = c.encrypt('secret').split('.') as [string, string, string];
    const flipped = Buffer.from(data, 'base64');
    flipped[0] = flipped[0]! ^ 0xff;
    expect(() => c.decrypt([iv, tag, flipped.toString('base64')].join('.'))).toThrow();
  });

  it('refuses a ciphertext encrypted under a different key', () => {
    const a = createCipher(key());
    const b = createCipher(key());
    expect(() => b.decrypt(a.encrypt('secret'))).toThrow();
  });

  it('rejects a key of the wrong length rather than silently weakening', () => {
    expect(() => createCipher(randomBytes(16).toString('base64'))).toThrow(/32 bytes/);
  });

  it('rejects a malformed payload', () => {
    expect(() => createCipher(key()).decrypt('not-a-payload')).toThrow(/malformed/);
  });
});
