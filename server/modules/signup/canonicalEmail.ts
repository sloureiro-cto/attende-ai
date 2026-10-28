import 'server-only';
import { createHash } from 'crypto';

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * One identity per mailbox for trial abuse checks: lowercases, drops `+tag` suffixes and, for
 * Gmail, the dots in the local part (`a.b+x@gmail.com` and `ab@gmail.com` are the same mailbox).
 */
export function canonicalEmail(email: string): string {
  const [rawLocal = '', rawDomain = ''] = email.trim().toLowerCase().split('@');
  const domain = rawDomain === 'googlemail.com' ? 'gmail.com' : rawDomain;
  let local = rawLocal.split('+')[0] ?? '';
  if (GMAIL_DOMAINS.has(domain)) local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

export const emailDomain = (email: string): string =>
  email.trim().toLowerCase().split('@')[1] ?? '';

/** Stable one-way key for storing identifiers (card fingerprints, mailboxes) used only for dedupe. */
export const sha256Hex = (value: string): string =>
  createHash('sha256').update(value).digest('hex');
