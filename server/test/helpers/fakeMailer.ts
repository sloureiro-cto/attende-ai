import type { Mail, Mailer } from '../../lib/mailer';

export class FakeMailer implements Mailer {
  sent: Mail[] = [];
  async send(mail: Mail) {
    this.sent.push(mail);
  }
  lastOtp(to: string): string {
    const mail = [...this.sent].reverse().find((m) => m.to === to);
    const code = /(\d{6})/.exec(mail?.text ?? '')?.[1];
    if (!code) throw new Error(`no OTP sent to ${to}`);
    return code;
  }
}
