import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createToken, hashPassword } from '@/lib/auth'

// POST /api/auth — Authenticate with credentials
// Supports both ADMIN_PASSWORD env var and database users
export async function POST(request: NextRequest) {
  try {
    let body: { username?: string; password?: string }
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const { username, password } = body

    const adminPassword = process.env.ADMIN_PASSWORD

    // ── Case 1: No credentials provided ──
    if (!username || !password) {
      // If no ADMIN_PASSWORD is configured, auth is not required
      if (!adminPassword) {
        return NextResponse.json({
          authenticated: true,
          message: 'Authentication not required (no ADMIN_PASSWORD set)',
          token: null,
          role: 'admin',
        })
      }
      return NextResponse.json(
        { error: 'Nom d\'utilisateur et mot de passe requis', needsAuth: true },
        { status: 400 }
      )
    }

    // ── Case 2: Try ADMIN_PASSWORD (legacy super-admin) ──
    if (adminPassword && username === 'admin' && password === adminPassword) {
      const token = await createToken({ userId: 'admin', username: 'admin', role: 'admin' })
      return NextResponse.json({
        authenticated: true,
        token,
        expiresIn: 86400,
        role: 'admin',
        name: 'Administrateur',
      })
    }

    // ── Case 3: Try database user ──
    try {
      const user = await db.user.findUnique({ where: { username } })
      if (user && user.isActive) {
        const valid = await verifyPassword(password, user.password)
        if (valid) {
          // Update last login
          await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })

          const token = await createToken({ userId: user.id, username: user.username, role: user.role })
          return NextResponse.json({
            authenticated: true,
            token,
            expiresIn: 86400,
            role: user.role,
            name: user.name,
          })
        }
      }
    } catch (dbError) {
      // User table might not exist yet (before migration)
      console.error('[Auth] DB user lookup failed:', dbError)
    }

    return NextResponse.json(
      { error: 'Identifiants invalides' },
      { status: 403 }
    )
  } catch (error) {
    console.error('[POST /api/auth]', error)
    return NextResponse.json(
      { error: 'Erreur d\'authentification' },
      { status: 500 }
    )
  }
}
