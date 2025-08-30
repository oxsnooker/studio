
import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/app/session';

export async function middleware(request: NextRequest) {
  const session = await getSession();
  const { pathname } = request.nextUrl;

  // If user is not authenticated, redirect to login page for protected routes
  if (!session) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // If user is authenticated
  const { role } = session;

  // Redirect logged-in users from the login page to their respective dashboards
  if (pathname === '/') {
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (role === 'staff') {
      return NextResponse.redirect(new URL('/staff', request.url));
    }
  }

  // Protect admin routes from staff
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/staff', request.url));
  }

  // Protect staff routes from admin
  if (pathname.startsWith('/staff') && role !== 'staff') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
