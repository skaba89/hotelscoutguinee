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

const MAX_CONTENT_LENGTH = 1 * 1024 * 1024; // 1MB

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only process API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Reject oversized request bodies on write methods
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentLength = request.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength, 10) > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: 'Request body exceeds 1MB limit' },
        { status: 413 }
      );
    }
  }

  // Determine the effective CORS origin
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  const isRestrictedOrigin = allowedOrigin !== '*';

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    const preflightHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-cron-secret',
      'Access-Control-Max-Age': '86400',
    };
    if (isRestrictedOrigin) {
      preflightHeaders['Access-Control-Allow-Credentials'] = 'true';
      preflightHeaders['Vary'] = 'Origin';
    }
    return new NextResponse(null, {
      status: 204,
      headers: preflightHeaders,
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
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-cron-secret');

  if (isRestrictedOrigin) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
