import { NextResponse } from 'next/server';

function hostnameOf(hostHeader) {
  return String(hostHeader || '')
    .split(':')[0]
    .trim()
    .toLowerCase();
}

function isPlatformHost(host) {
  if (!host) return true;
  const clean = hostnameOf(host);
  if (clean === 'localhost' || clean === '127.0.0.1' || clean === '0.0.0.0') return true;
  if (clean.endsWith('.vercel.app')) return true;
  if (clean.includes('ngrok') || clean.includes('trycloudflare')) return true;
  if (
    clean === 'upklick.net' ||
    clean === 'www.upklick.net' ||
    clean === 'app.upklick.net' ||
    clean.endsWith('.upklick.net') ||
    clean === 'upklick.com' ||
    clean === 'www.upklick.com' ||
    clean === 'app.upklick.com' ||
    clean.endsWith('.upklick.com')
  ) {
    return true;
  }
  const extras = String(process.env.NEXT_PUBLIC_APP_HOSTS || '')
    .split(',')
    .map((item) => hostnameOf(item))
    .filter(Boolean);
  return extras.includes(clean);
}

export function proxy(request) {
  const host = hostnameOf(request.headers.get('host'));
  if (isPlatformHost(host)) return NextResponse.next();

  const url = request.nextUrl.clone();
  if (
    url.pathname.startsWith('/preview-site') || 
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next')
  ) {
    return NextResponse.next();
  }

  url.pathname = '/preview-site';
  url.searchParams.set('host', host);
  url.searchParams.set('path', request.nextUrl.pathname || '/');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-custom-domain', host);
  requestHeaders.set('x-custom-path', request.nextUrl.pathname || '/');

  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)']
};

export default proxy;

