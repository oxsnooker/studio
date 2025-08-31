
'use server';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const secretKey = process.env.SESSION_SECRET || 'fallback-secret-for-development';
const key = new TextEncoder().encode(secretKey);

const sessionSchema = z.object({
    role: z.enum(['admin', 'staff']),
    username: z.string().optional(),
    name: z.string().optional(),
    expires: z.date().optional(),
});

type SessionPayload = z.infer<typeof sessionSchema>;

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // 1 day
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return sessionSchema.parse(payload);
  } catch (error) {
    console.error('Failed to verify session:', error);
    return null;
  }
}

export async function createSession(payload: Omit<SessionPayload, 'expires'>) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  const session = await encrypt({ ...payload, expires });

  cookies().set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    path: '/',
  });
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookie = cookies().get('session')?.value;
  if (!cookie) {
    return null;
  }
  const session = await decrypt(cookie);
  return session;
}

export async function deleteSession() {
  cookies().delete('session');
}

export async function logout() {
    await deleteSession();
    redirect('/');
}
