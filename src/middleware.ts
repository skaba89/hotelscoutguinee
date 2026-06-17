// HotelScout Guinea — API Proxy (Next.js 16)
// Handles CORS, authentication for sensitive routes
// NOTE: Token verification is done here in lightweight mode;
// full verification with DB lookup happens in API route handlers.

import { NextRequest, NextResponse } from 'next/server';

// Routes that allow unauthenticated GET requests
const PUBLIC_READ_ROUTES = [
  '/api',           // Health check
  '/api/health',    // Detailed health check
  '/api/stats',     // Public stats
  '/api/hotels',    // Read-only (GET)
  '/api/hotels/cities',
  '/api/pipeline',  // Read-only (GET)
  '/api/agency',    // Read-only (GET)
];

// Routes that allow unauthenticated POST requests (e.g. login, signup)
// These routes handle their own credential validation internally.
const PUBLIC_WRITE_ROUTES = [
  '/api/auth',      // Login endpoint — must be reachable without a token
];

// Routes that require CRON_SECRET
const CRON_ROUTES = [
  '/api/cron/collect',
  '/api/cron/scheduled',
];

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const MAX_CONTENT_LENGTH = 1 * 1024 * 1024; // 1MB

/**
 * Lightweight token check in middleware.
 * Validates format only — full signature verification happens in route handlers.
 * Returns true if the token appears valid (has correct structure).
 */
function hasValidTokenFormat(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const token = authHeader.slice(7)

  // Special sentinel token when no ADMIN_PASSWORD is configured
  if (token === '__no_auth_required__') return true

  // Check for HMAC-signed token format (base64.base64)
  if (token.includes('.') && token.split('.').length === 2) {
    try {
      const payload = JSON.parse(atob(token.split('.')[0]))
      // Has required fields and not expired
      if (payload.userId && payload.username && payload.exp) {
        const now = Math.floor(Date.now() / 1000)
        return payload.exp > now
      }
    } catch {
      return false
    }
  }

  // Check for legacy base64 format (admin:password)
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    if (decoded.includes(':') && decoded.startsWith('admin:')) {
      return true
    }
  } catch {
    return false
  }

  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only process API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Reject oversized request bodies
  if (WRITE_METHODS.includes(request.method)) {
    const contentLength = request.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength, 10) > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: 'Request body exceeds 1MB limit' },
        { status: 413 }
      );
    }
  }

  // CORS
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
    return new NextResponse(null, { status: 204, headers: preflightHeaders });
  }

  // Protect cron routes — require CRON_SECRET or Bearer token
  if (CRON_ROUTES.some(route => pathname.startsWith(route))) {
    const cronSecret = process.env.CRON_SECRET;
    const cronAuthHeader = request.headers.get('x-cron-secret');

    if (cronSecret && cronAuthHeader === cronSecret) {
      // Valid CRON_SECRET
    } else if (!hasValidTokenFormat(request.headers.get('Authorization'))) {
      return NextResponse.json(
        { error: 'Authentication required for cron endpoint' },
        { status: 401 }
      );
    }
  }

  // ── Determine if auth is needed ──
  const isWriteOperation = WRITE_METHODS.includes(request.method);

  const protectedReadRoutes = [
    '/api/ai/providers', '/api/ai/chat',
    '/api/contacts', '/api/export',
    '/api/reservations', '/api/planning',
    '/api/hotels/enrich', '/api/hotels/search', '/api/hotels/verify',
    '/api/users',
  ];

  const isProtectedRead = request.method === 'GET' &&
    protectedReadRoutes.some(route => pathname.startsWith(route));

  const isPublicRead = request.method === 'GET' &&
    PUBLIC_READ_ROUTES.some(route => pathname === route || (pathname.startsWith(route) && pathname.replace(route, '').startsWith('/')));

  const isPublicWrite = request.method === 'POST' &&
    PUBLIC_WRITE_ROUTES.some(route => pathname === route);

  const needsAuth = ((isWriteOperation && !isPublicRead && !isPublicWrite) || isProtectedRead);

  if (needsAuth) {
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminPassword) {
      if (!hasValidTokenFormat(request.headers.get('Authorization'))) {
        return NextResponse.json(
          { error: 'Authentication required', needsAuth: true },
          { status: 401 }
        );
      }
    }
  }

  // Add security headers
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
