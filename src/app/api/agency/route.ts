import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/agency — Get agency settings
export async function GET() {
  try {
    let settings = await db.agencySettings.findFirst()
    if (!settings) {
      // Create default settings if none exist
      settings = await db.agencySettings.create({
        data: { name: 'HotelScout Guinea' },
      })
    }
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[GET /api/agency]', error)
    return NextResponse.json({ error: 'Failed to fetch agency settings' }, { status: 500 })
  }
}

// PUT /api/agency — Update agency settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    let settings = await db.agencySettings.findFirst()

    if (!settings) {
      settings = await db.agencySettings.create({
        data: {
          name: body.name ?? 'HotelScout Guinea',
          email: body.email ?? null,
          phone: body.phone ?? null,
          website: body.website ?? null,
          address: body.address ?? null,
        },
      })
    } else {
      const updateData: Record<string, unknown> = {}
      if (body.name !== undefined) updateData.name = body.name
      if (body.email !== undefined) updateData.email = body.email
      if (body.phone !== undefined) updateData.phone = body.phone
      if (body.website !== undefined) updateData.website = body.website
      if (body.address !== undefined) updateData.address = body.address

      settings = await db.agencySettings.update({
        where: { id: settings.id },
        data: updateData,
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[PUT /api/agency]', error)
    return NextResponse.json({ error: 'Failed to update agency settings' }, { status: 500 })
  }
}
