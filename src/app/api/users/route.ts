import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, verifyPassword } from '@/lib/auth'

// GET /api/users — List all users (admin only)
export async function GET() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('[GET /api/users]', error)
    return NextResponse.json({ users: [], dbError: true })
  }
}

// POST /api/users — Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, name, email, role } = body

    // Validate required fields
    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur, mot de passe et nom sont requis' },
        { status: 400 }
      )
    }

    // Validate username format (alphanumeric + underscore, 3-30 chars)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'Le nom d\'utilisateur doit contenir 3-30 caractères (lettres, chiffres, _)' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    // Validate role
    const VALID_ROLES = ['admin', 'agent', 'viewer']
    const userRole = role || 'agent'
    if (!VALID_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: `Le rôle doit être: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { error: 'Ce nom d\'utilisateur existe déjà' },
        { status: 409 }
      )
    }

    // Hash the password
    const hashedPassword = await hashPassword(password)

    // Create the user
    const user = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        email: email || null,
        role: userRole,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/users]', error)
    return NextResponse.json(
      { error: 'Impossible de créer l\'utilisateur' },
      { status: 500 }
    )
  }
}
