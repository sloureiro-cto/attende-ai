import 'server-only';
/**
 * Every error this service answers with has one wire shape (the same the JSYNQ platform uses):
 * `{ error: true, code: <http>, message, reference?, details? }`. Clients branch on `reference`
 * (signup, billing, gate) or on `details.code` (agents), never on the message.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly reference?: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toBody() {
    return {
      error: true,
      code: this.status,
      message: this.message,
      ...(this.reference ? { reference: this.reference } : {}),
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

/** Agent-style error: the machine code travels in `details.code` (and in `reference`). */
export const codedError = (
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {}
) => new AppError(status, message, code, { code, ...extra });

export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new AppError(400, message, undefined, details);
export const notFound = (message = 'Not found') => new AppError(404, message);
