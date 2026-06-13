// HotelScout Guinea — API Middleware
// Handles CORS, authentication, basic auth for sensitive routes, and rate limiting headers

import { NextRequest, NextResponse } from 'next/server';

// Routes that don't require authentication
const UNAUTHENTICATED_ROUTES = [
  '/api',           // Health check
  '/api/stats',     // Public stats
  '/api/hotels',    // Read-only access (GET)
  '/api/pipeline',  // Read-only access (GET)
  '/api/agency',    // Read-only access (GET)
];

// Routes that require CRON_SECRET specifically
const CRON_ROUTES = [
  '/api/cron/collect',
  '/api/cron/scheduled',
];

// Write operations that require admin authentication
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const MAX_CONTENT_LENGTH = 1 * 1024 * 1024; // 1MB

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only process API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Reject oversized request bodies on write methods
  if (WRITE_METHODS.includes(request.method)) {
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
      'Access-Control-Allow-Headers': 'Content-Type, x-cron-secret, Authorization',
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

  // Protect cron routes — require CRON_SECRET or admin Bearer token
  if (CRON_ROUTES.some(route => pathname.startsWith(route))) {
    const cronSecret = process.env.CRON_SECRET;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Check x-cron-secret header first
    const cronAuthHeader = request.headers.get('x-cron-secret');
    if (cronSecret && cronAuthHeader === cronSecret) {
      // Valid CRON_SECRET, allow through
    } else if (adminPassword) {
      // Try admin Bearer token as alternative
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required for cron endpoint. Provide x-cron-secret or Authorization Bearer token.' },
          { status: 401 }
        );
      }
      try {
        const token = authHeader.slice(7);
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [user, pass] = decoded.split(':');
        if (user !== 'admin' || pass !== adminPassword) {
          return NextResponse.json(
            { error: 'Invalid credentials for cron endpoint' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 403 }
        );
      }
    }
    // If neither CRON_SECRET nor ADMIN_PASSWORD is set, cron routes are public
  }

  // Admin authentication for write operations on protected routes
  const isAdminRequired = WRITE_METHODS.includes(request.method) &&
    !UNAUTHENTICATED_ROUTES.some(route => pathname === route || (pathname.startsWith(route) && pathname.replace(route, '').startsWith('/')));

  // Special case: GET on certain routes should also be protected
  const protectedReadRoutes = [
    '/api/ai/providers',   // Contains API key hints
    '/api/ai/chat',        // Uses AI credits
    '/api/contacts',       // Contains contact data
    '/api/export',         // Data export
    '/api/reservations',   // Reservation data
    '/api/planning',       // Planning data
    '/api/hotels/enrich',  // Uses AI
    '/api/hotels/search',  // Uses search API
    '/api/hotels/verify',  // Uses verification API
  ];

  const isProtectedRead = request.method === 'GET' &&
    protectedReadRoutes.some(route => pathname.startsWith(route));

  if (isAdminRequired || isProtectedRead) {
    const adminPassword = process.env.ADMIN_PASSWORD;

    // If ADMIN_PASSWORD is set, require authentication
    if (adminPassword) {
      const authHeader = request.headers.get('Authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required', needsAuth: true },
          { status: 401 }
        );
      }

      const token = authHeader.slice(7);

      // Simple token validation: token should be a base64 of admin:password
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [user, pass] = decoded.split(':');

        if (user !== 'admin' || pass !== adminPassword) {
          return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 403 }
        );
      }
    }
  }

  // Add security headers to all API responses
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-cron-secret, Authorization');

  if (isRestrictedOrigin) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
