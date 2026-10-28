import 'server-only';
import { createHash, timingSafeEqual } from 'crypto';

export const sha256Hex = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const isObjectId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value);
