import 'server-only';
import { createHmac } from 'crypto';
import { safeEqual } from '../../lib/crypto';

export const SIGNATURE_TOLERANCE_S = 300;

/** `X-Jsynq-Signature: t=<unix s>,v1=<hex HMAC-SHA256(secret, "<t>." + raw body)>` (P4 contract). */
export function signPayload(secret: string, rawBody: Buffer | string, t: number): string {
  const v1 = createHmac('sha256', secret).update(`${t}.`).update(rawBody).digest('hex');
  return `t=${t},v1=${v1}`;
}

export function verifySignature(secret: string, rawBody: Buffer, header: string | undefined, nowS: number): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    })
  ) as { t?: string; v1?: string };
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !parts.v1 || Math.abs(nowS - t) > SIGNATURE_TOLERANCE_S) return false;
  const expected = signPayload(secret, rawBody, t).split('v1=')[1]!;
  return safeEqual(expected, parts.v1);
}
