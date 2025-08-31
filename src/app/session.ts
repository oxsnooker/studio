
'use server';

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase';
import { redirect } from 'next/navigation';

const cookieName = 'session';

export async function createSession(idToken: string) {
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
  
  cookies().set(cookieName, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: expiresIn,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession() {
  const sessionCookie = cookies().get(cookieName)?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}

export async function deleteSession() {
  cookies().delete(cookieName);
  redirect('/');
}
