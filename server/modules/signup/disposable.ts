import 'server-only';
import { env } from '../../config/env';
import { emailDomain } from './canonicalEmail';

/**
 * Throwaway-mailbox providers. Deliberately a small, auditable list of the well-known services
 * (not a vendor feed): it stops the casual repeat-trial case; the card fingerprint is the real
 * defence. Extend through `EXTRA_DISPOSABLE_DOMAINS` (comma separated) without a deploy
 * of code.
 */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'pokemail.net',
  'spam4.me',
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'tempmailo.com',
  'tempail.com',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.de',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.org',
  'nospam.ze.tc',
  'dispostable.com',
  'getnada.com',
  'nada.email',
  'maildrop.cc',
  'mailnesia.com',
  'mailcatch.com',
  'mintemail.com',
  'mohmal.com',
  'emailondeck.com',
  'fakeinbox.com',
  'fakemail.net',
  'mytemp.email',
  'burnermail.io',
  'discard.email',
  'discardmail.com',
  'spambox.us',
  'spamgourmet.com',
  'tmpmail.org',
  'tmpmail.net',
  'tempinbox.com',
  'moakt.com',
  'mail.tm',
  'inboxkitten.com',
  'dropmail.me',
  'anonbox.net',
  'mailforspam.com',
  'harakirimail.com',
  'tempr.email',
  'emailfake.com',
  'fakemailgenerator.com',
  'luxusmail.org',
  'owlymail.com',
  'mailtemp.info',
  'tempmailaddress.com',
  'trbvm.com',
  'vomoto.com',
  'zetmail.com',
]);

const extra = (): string[] =>
  (env().EXTRA_DISPOSABLE_DOMAINS)
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain) || extra().includes(domain);
}
