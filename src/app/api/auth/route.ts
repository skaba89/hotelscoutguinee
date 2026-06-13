import { NextRequest, NextResponse } from 'next/server'

// POST /api/auth — Authenticate with admin credentials
// Returns a base64 token for use in subsequent API requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    const adminPassword = process.env.ADMIN_PASSWORD

    // If no ADMIN_PASSWORD is configured, authentication is disabled
    if (!adminPassword) {
      return NextResponse.json({
        authenticated: true,
        message: 'Authentication not required (no ADMIN_PASSWORD set)',
        token: null,
      })
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    if (username !== 'admin' || password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 403 }
      )
    }

    // Generate a simple base64 token (admin:password)
    const token = Buffer.from(`${username}:${password}`).toString('base64')

    return NextResponse.json({
      authenticated: true,
      token,
      expiresIn: 86400, // 24 hours
    })
  } catch (error) {
    console.error('[POST /api/auth]', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
