import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'

type RouteContext = {
  params: Promise<{ id: string }>
}

// PUT /api/users/[id] — Update a user (admin only)
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    // Check user exists
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Validate role if provided
    const VALID_ROLES = ['admin', 'agent', 'viewer']
    if (body.role !== undefined && !VALID_ROLES.includes(body.role)) {
      return NextResponse.json(
        { error: `Le rôle doit être: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate email if provided
    if (body.email !== undefined && body.email !== null && body.email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.email !== undefined) updateData.email = body.email || null
    if (body.role !== undefined) updateData.role = body.role
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    // If password is provided, hash and update it
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json(
          { error: 'Le mot de passe doit contenir au moins 6 caractères' },
          { status: 400 }
        )
      }
      updateData.password = await hashPassword(body.password)
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
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
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[PUT /api/users/[id]]', error)
    return NextResponse.json(
      { error: 'Impossible de mettre à jour l\'utilisateur' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] — Deactivate a user (admin only)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    // Check user exists
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Soft-delete: deactivate instead of deleting
    const user = await db.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        username: true,
        name: true,
        isActive: true,
      },
    })

    return NextResponse.json({ user, deactivated: true })
  } catch (error) {
    console.error('[DELETE /api/users/[id]]', error)
    return NextResponse.json(
      { error: 'Impossible de supprimer l\'utilisateur' },
      { status: 500 }
    )
  }
}
