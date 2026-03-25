import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const roleCookie = request.cookies.get('crm_role');
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  
  if (!roleCookie && !isLoginPage && request.nextUrl.pathname.startsWith('/crm')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (roleCookie && isLoginPage) {
    return NextResponse.redirect(new URL('/crm', request.url));
  }

  // Allow root path '/' to go to login or crm depending on auth
  if (request.nextUrl.pathname === '/') {
    if (roleCookie) {
      return NextResponse.redirect(new URL('/crm', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/crm/:path*', '/login'],
}
