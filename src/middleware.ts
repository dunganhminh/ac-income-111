import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if trying to access /crm or any sub-route
  if (request.nextUrl.pathname.startsWith('/crm')) {
    const userId = request.cookies.get('crm_user_id')?.value;
    
    // If not logged in, redirect to /login
    if (!userId) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Check if trying to access /login while already logged in
  if (request.nextUrl.pathname === '/login') {
     const userId = request.cookies.get('crm_user_id')?.value;
     if (userId) {
       const crmUrl = new URL('/crm', request.url);
       return NextResponse.redirect(crmUrl);
     }
  }

  // For / automatically redirect to /login
  if (request.nextUrl.pathname === '/') {
    const userId = request.cookies.get('crm_user_id')?.value;
    if (userId) {
       const crmUrl = new URL('/crm', request.url);
       return NextResponse.redirect(crmUrl);
     } else {
       const loginUrl = new URL('/login', request.url);
       return NextResponse.redirect(loginUrl);
     }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/crm/:path*', '/login', '/'],
};
