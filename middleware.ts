
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  const { pathname } = request.nextUrl;

  const isLoggedIn = !!authCookie;

  if (isLoggedIn) {
    try {
      const authData = JSON.parse(authCookie.value);
      const userRole = authData.role;

      // If logged in, redirect away from the login page
      if (pathname === '/') {
        const url = request.nextUrl.clone();
        url.pathname = userRole === 'admin' ? '/admin' : '/staff';
        return NextResponse.redirect(url);
      }
      
      // Role-based access control
      if (pathname.startsWith('/admin') && userRole !== 'admin') {
         const url = request.nextUrl.clone();
         url.pathname = '/staff'; // Or a dedicated 'unauthorized' page
         return NextResponse.redirect(url);
      }
      
      if (pathname.startsWith('/staff') && userRole !== 'staff' && userRole !== 'admin') {
         const url = request.nextUrl.clone();
         url.pathname = '/';
         return NextResponse.redirect(url);
      }

    } catch (e) {
        // Invalid cookie, treat as not logged in
        const url = request.nextUrl.clone();
        url.pathname = '/';
        const response = NextResponse.redirect(url);
        response.cookies.delete('auth');
        return response;
    }

  } else {
    // If not logged in, protect the dashboards
    if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
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
