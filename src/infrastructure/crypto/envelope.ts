import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Token encryption at rest.
 *
 * AES-256-GCM with a random IV per record and the auth tag stored alongside, so
 * a tampered ciphertext fails to decrypt rather than yielding garbage. The key
 * comes from the environment and never from the database — a database dump
 * alone must not be enough to use someone's BattleGrid account.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

export interface Cipher {
  encrypt(plaintext: string): string;
  decrypt(payload: string): string;
}

export function createCipher(keyBase64: string): Cipher {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('token encryption key must be 32 bytes, base64-encoded');
  }

  return {
    encrypt(plaintext: string): string {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, key, iv);
      const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      // iv.tag.ciphertext — self-describing, so rotation can be added later
      // without guessing at the layout.
      return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.');
    },

    decrypt(payload: string): string {
      const parts = payload.split('.');
      if (parts.length !== 3) throw new Error('malformed encrypted payload');
      const [ivB64, tagB64, dataB64] = parts as [string, string, string];
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
    },
  };
}
