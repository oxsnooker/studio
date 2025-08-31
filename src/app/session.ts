
'use server';

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const secretKey = process.env.SESSION_SECRET || 'your-super-secret-key-that-is-at-least-32-bytes-long';
if (secretKey.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 bytes long');
}
const key = new TextEncoder().encode(secretKey);
const cookieName = 'session';


export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // 1 day
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (e) {
    console.error('JWT verification failed:', e);
    return null;
  }
}

export async function createSession(payload: any) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const session = await encrypt(payload);

  cookies().set(cookieName, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession() {
  const cookie = cookies().get(cookieName)?.value;
  if (!cookie) return null;
  return await decrypt(cookie);
}

export async function deleteSession() {
  cookies().set(cookieName, '', { expires: new Date(0) });
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get(cookieName)?.value;
  if (!session) return;

  // Refresh the session so it doesn't expire
  const parsed = await decrypt(session);
  parsed.expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const res = NextResponse.next();
  res.cookies.set({
    name: cookieName,
    value: await encrypt(parsed),
    httpOnly: true,
    expires: parsed.expires,
  });
  return res;
}
