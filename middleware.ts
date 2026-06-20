import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;

  // No password configured → open access (local dev convenience)
  if (!password) return NextResponse.next();

  const auth = request.headers.get('authorization') ?? '';
  if (auth.startsWith('Basic ')) {
    const decoded  = atob(auth.slice(6));          // "user:pass"
    const colonIdx = decoded.indexOf(':');
    const pass     = decoded.slice(colonIdx + 1);
    if (pass === password) return NextResponse.next();
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Dice Quest Admin"' },
  });
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
