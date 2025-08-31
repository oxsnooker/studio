
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

  const session = await getSession();

  if (!session && (isProtectedAdminRoute || isProtectedStaffRoute)) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  if (session) {
    if (isProtectedAdminRoute && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.nextUrl));
    }
    if (isProtectedStaffRoute && session.role !== 'staff' && session.role !== 'admin') {
       return NextResponse.redirect(new URL('/', req.nextUrl));
    }
    if (isPublicRoute) {
        if(session.role === 'admin') {
            return NextResponse.redirect(new URL('/admin', req.nextUrl));
        }
        if(session.role === 'staff') {
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
