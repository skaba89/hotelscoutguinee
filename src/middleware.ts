// HotelScout Guinea — API Middleware
// Handles CORS, basic auth for sensitive routes, and rate limiting headers

import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_API_ROUTES = [
  '/api/stats',
  '/api/hotels',
  '/api/pipeline',
  '/api/contacts',
  '/api/export',
  '/api/ai/providers',
  '/api/ai/chat',
];

const PROTECTED_ROUTES = [
  '/api/cron/collect',
  '/api/cron/scheduled',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only process API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-cron-secret',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Protect cron routes — require CRON_SECRET if configured
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('x-cron-secret');
      if (authHeader !== cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
  }

  // Add security headers to all API responses
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-cron-secret');

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
