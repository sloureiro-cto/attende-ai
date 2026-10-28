import 'server-only';
import { jsynqRequest } from './http';
import type { JsynqLanguage, JsynqLoginSummary } from './types';

/**
 * JSYNQ's public account routes, the ones the JSYNQ web app's own signup uses. No credential:
 *   POST  /api/users               create the user (unverified, 2FA on) and e-mail a signup OTP
 *   PATCH /api/users/verify-otp    check that OTP, mark the user verified, answer the login summary
 *   POST  /api/verification-otps   e-mail a new signup OTP
 * None is idempotent (each POST sends an e-mail), so none is retried.
 */
export function accountsClient() {
  return {
    /** 201. 400 "E-mail address already in use" when the e-mail has a JSYNQ user; 422 for a body JSYNQ rejects. */
    async register(input: { name: string; email: string; password: string; language: JsynqLanguage }): Promise<void> {
      await jsynqRequest({ method: 'POST', path: '/api/users', body: input, idempotent: false });
    },
    /** 200 with the login summary. 404 no OTP, 400 expired / invalid (the message says which). */
    async verifySignupOtp(input: { email: string; otp: string }): Promise<JsynqLoginSummary> {
      const res = await jsynqRequest<JsynqLoginSummary>({ method: 'PATCH', path: '/api/users/verify-otp', body: { identifier: input.email, otp: input.otp }, idempotent: false });
      return res.body;
    },
    /** 201. 404 when JSYNQ has no user with this e-mail. */
    async resendSignupOtp(email: string): Promise<void> {
      await jsynqRequest({ method: 'POST', path: '/api/verification-otps', body: { identifier: email }, idempotent: false });
    },
  };
}

export type AccountsClient = ReturnType<typeof accountsClient>;
