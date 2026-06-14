// HotelScout Guinea — Authentication Utilities
// Password hashing with bcryptjs, token management

import * as bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

// ─── Password Hashing ──────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ─── Token Management ──────────────────────────────────────────────
// Uses a simple HMAC approach that works in Edge Runtime (Web Crypto API)

const JWT_SECRET = process.env.ENCRYPTION_KEY || 'hotelscout-guinea-default-key-32b!'

interface TokenPayload {
  userId: string
  username: string
  role: string
  iat: number
  exp: number
}

function getSecretKey(): string {
  return JWT_SECRET.padEnd(32, '0').slice(0, 32)
}

/**
 * Create a signed token for a user session.
 * Uses a simple HMAC-based approach compatible with Edge Runtime.
 */
export async function createToken(payload: { userId: string; username: string; role: string }): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 86400 // 24 hours

  const body = btoa(JSON.stringify({ ...payload, iat, exp }))

  // Sign using Web Crypto API (works in Edge Runtime)
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecretKey()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))

  return `${body}.${sigBase64}`
}

/**
 * Verify and decode a signed token.
 * Returns null if the token is invalid or expired.
 * Works in Edge Runtime (uses Web Crypto API).
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null

    const [body, signature] = parts

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(getSecretKey()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const sigBytes = new Uint8Array(Array.from(atob(signature), c => c.charCodeAt(0)))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body))
    if (!valid) return null

    // Decode payload
    const payload: TokenPayload = JSON.parse(atob(body))

    // Check expiration
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null // Token expired
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Extract and verify token from Authorization header.
 * Supports both Bearer tokens (new HMAC format) and legacy base64 format.
 */
export async function extractUserFromAuth(authHeader: string): Promise<{ userId: string; username: string; role: string } | null> {
  if (!authHeader.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)

  // Try new HMAC-signed token format
  const jwtPayload = await verifyToken(token)
  if (jwtPayload) {
    return { userId: jwtPayload.userId, username: jwtPayload.username, role: jwtPayload.role }
  }

  // Fallback: legacy base64 format (admin:password)
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [user, pass] = decoded.split(':')
    const adminPassword = process.env.ADMIN_PASSWORD
    if (user === 'admin' && adminPassword && pass === adminPassword) {
      return { userId: 'admin', username: 'admin', role: 'admin' }
    }
  } catch {
    // Invalid base64
  }

  return null
}
