import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const url = request.nextUrl;

  // Allow www + apex to behave normally
  if (host === 'www.getflowetic.com' || host === 'getflowetic.com' || host.includes('localhost')) {
    return NextResponse.next();
  }

  // Route {subdomain}.getflowetic.com -> /client/{subdomain}
  if (host.endsWith('.getflowetic.com')) {
    const subdomain = host.replace('.getflowetic.com', '').split(':')[0];
    const rewriteUrl = url.clone();
    rewriteUrl.pathname = `/client/${subdomain}${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};
