/** Auth-related backend calls (custom FastAPI auth — Option A). */

import { apiRequest } from '@/lib/api';
import type { Session } from '@/lib/auth';

type SessionResponse = {
  user_id: number;
  name: string;
  email: string;
};

function toSession(r: SessionResponse): Session {
  return { userId: r.user_id, name: r.name, email: r.email };
}

/** Sign in with an existing verified account. */
export async function signIn(email: string, password: string): Promise<Session> {
  const r = await apiRequest<SessionResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return toSession(r);
}

/** Create an account; the backend emails a verification code. */
export async function signUp(name: string, email: string, password: string): Promise<void> {
  await apiRequest<{ ok: boolean }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

/** Verify the emailed code; resolves to a signed-in session. */
export async function verifyCode(email: string, code: string): Promise<Session> {
  const r = await apiRequest<SessionResponse>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  return toSession(r);
}

/** Request a fresh verification code. */
export async function resendCode(email: string): Promise<void> {
  await apiRequest<{ ok: boolean }>('/auth/resend', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}
