import jwt from 'jsonwebtoken';

export const AUTH_SECRET = 'test-auth-secret-0123456789';

/** A user JWT exactly like the ones JSYNQ / NextAuth sign (HS256, `AUTH_SECRET`). */
export const userToken = (claims: { id: string; email?: string; workspaceId?: string | null }) =>
  jwt.sign({ name: 'Test', ...claims }, AUTH_SECRET, { algorithm: 'HS256', expiresIn: 3600 });
