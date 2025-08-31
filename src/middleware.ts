
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/app/session';

export async function middleware(request: NextRequest) {
  const session = await verifySession();
  const { pathname } = request.nextUrl;
  const loginUrl = new URL('/', request.url);

  // If there's no session, redirect to login page for protected routes
  if (!session) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // If there is a session, handle role-based access
  if (session.role === 'admin') {
    // Admins can access /admin, but are redirected from /staff
    if (pathname.startsWith('/staff')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  } else if (session.role === 'staff') {
    // Staff can access /staff, but are redirected from /admin
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/staff', request.url));
    }
  } else {
    // If role is somehow invalid, redirect to login
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/admin/:path*', '/staff/:path*'],
};
