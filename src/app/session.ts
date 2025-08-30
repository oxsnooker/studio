
'use server';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';

const sessionSchema = z.object({
  role: z.enum(['admin', 'staff']),
  username: z.string(),
});

export type Session = z.infer<typeof sessionSchema>;

const secretKey = process.env.SESSION_SECRET || 'your-super-secret-key-change-me';
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // 1 day session
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // This can happen if the token is invalid or expired
    return null;
  }
}

export async function createSession(payload: Session) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const session = await encrypt({ ...payload, expires });

  cookies().set('session', session, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
}

export async function getSession(): Promise<Session | null> {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;

  const decrypted = await decrypt(sessionCookie);
  if (!decrypted) return null;

  const parsed = sessionSchema.safeParse(decrypted);
  if (!parsed.success) return null;

  return parsed.data;
}

export async function deleteSession() {
  cookies().delete('session');
}
