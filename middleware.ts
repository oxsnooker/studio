
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/session';

const protectedAdminRoutes = ['/admin'];
const protectedStaffRoutes = ['/staff'];
const publicRoutes = ['/'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedAdminRoute = protectedAdminRoutes.some((route) => path.startsWith(route));
  const isProtectedStaffRoute = protectedStaffRoutes.some((route) => path.startsWith(route));
  const isPublicRoute = publicRoutes.includes(path);

  const session = await getSession(); // This now returns the decoded Firebase ID token payload

  // If no session, redirect to login page if trying to access protected routes
  if (!session && (isProtectedAdminRoute || isProtectedStaffRoute)) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  if (session) {
    // If user has a session, check their role for protected routes
    const userRole = session.role; // Role should be in the custom claims of the token

    if (isProtectedAdminRoute && userRole !== 'admin') {
      // Non-admins trying to access admin routes are redirected
      return NextResponse.redirect(new URL('/', req.nextUrl));
    }
    if (isProtectedStaffRoute && userRole !== 'staff' && userRole !== 'admin') {
       // Only staff and admins can access staff routes
       return NextResponse.redirect(new URL('/', req.nextUrl));
    }
    
    // If a logged-in user is on a public page (like the login page), redirect them to their dashboard
    if (isPublicRoute) {
        if(userRole === 'admin') {
            return NextResponse.redirect(new URL('/admin', req.nextUrl));
        }
        if(userRole === 'staff') {
            return NextResponse.redirect(new URL('/staff', req.nextUrl));
        }
    }
  }

  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
