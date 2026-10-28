import 'server-only';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { log } from './logger';

export type Mail = { to: string; subject: string; text: string; html?: string };
export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Pluggable mailer: `log` (dev, nothing leaves the process), SMTP, or Resend's HTTP API. */
export function createMailer(): Mailer {
  const e = env();
  if (e.MAIL_PROVIDER === 'smtp') {
    const transport = nodemailer.createTransport(e.SMTP_URL!);
    return { send: async (m) => void (await transport.sendMail({ from: e.MAIL_FROM, ...m })) };
  }
  if (e.MAIL_PROVIDER === 'resend') {
    return {
      async send(m) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: e.MAIL_FROM, to: [m.to], subject: m.subject, text: m.text, html: m.html }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`mail provider answered ${res.status}`);
      },
    };
  }
  if (e.NODE_ENV === 'production') log.warn('mailer.log_only_in_production');
  return {
    async send(m) {
      // Dev only: the text (which carries the OTP) is printed so the flow can be tested locally.
      log.info('mailer.log', { to: m.to, subject: m.subject, text: m.text });
    },
  };
}
