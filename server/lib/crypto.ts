import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'crypto';
import { env } from '../config/env';

export const sha256Hex = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const key = () => Buffer.from(env().DATA_ENCRYPTION_KEY, 'base64');

/** AES-256-GCM. Output: base64(iv | tag | ciphertext). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
}

export function decrypt(sealed: string): string {
  const raw = Buffer.from(sealed, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}

/** Six digits, uniformly drawn. */
export const randomOtp = (): string => String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');

export const isObjectId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value);
