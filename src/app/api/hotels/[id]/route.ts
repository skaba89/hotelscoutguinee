import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/hotels/[id] — Get a single hotel by ID
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const hotel = await db.hotel.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { sentAt: 'desc' } },
        aiAnalyses: { orderBy: { createdAt: 'desc' } },
        verificationLogs: { orderBy: { checkedAt: 'desc' }, take: 20 },
      },
    })

    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ hotel })
  } catch (error) {
    console.error('[GET /api/hotels/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to fetch hotel' },
      { status: 500 }
    )
  }
}

// PUT /api/hotels/[id] — Update a hotel by ID
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    // Check hotel exists
    const existing = await db.hotel.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      )
    }

    // Build update data from provided fields only
    const updateData: Prisma.HotelUpdateInput = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.city !== undefined) updateData.city = body.city
    if (body.region !== undefined) updateData.region = body.region
    if (body.address !== undefined) updateData.address = body.address
    if (body.quartier !== undefined) updateData.quartier = body.quartier
    if (body.stars !== undefined) updateData.stars = body.stars
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.email !== undefined) updateData.email = body.email
    if (body.web !== undefined) updateData.web = body.web
    if (body.fb !== undefined) updateData.fb = body.fb
    if (body.wa !== undefined) updateData.wa = body.wa
    if (body.bookingUrl !== undefined) updateData.bookingUrl = body.bookingUrl
    if (body.tripadvisorUrl !== undefined) updateData.tripadvisorUrl = body.tripadvisorUrl
    if (body.ratingBooking !== undefined) updateData.ratingBooking = body.ratingBooking
    if (body.reviewsBooking !== undefined) updateData.reviewsBooking = body.reviewsBooking
    if (body.ratingTripadvisor !== undefined) updateData.ratingTripadvisor = body.ratingTripadvisor
    if (body.reviewsTripadvisor !== undefined) updateData.reviewsTripadvisor = body.reviewsTripadvisor
    if (body.priceUsd !== undefined) updateData.priceUsd = body.priceUsd
    if (body.rooms !== undefined) updateData.rooms = body.rooms
    if (body.amenities !== undefined) updateData.amenities = body.amenities
    if (body.hasBooking !== undefined) updateData.hasBooking = body.hasBooking
    if (body.hasTripadvisor !== undefined) updateData.hasTripadvisor = body.hasTripadvisor
    if (body.hasAgoda !== undefined) updateData.hasAgoda = body.hasAgoda
    if (body.hasExpedia !== undefined) updateData.hasExpedia = body.hasExpedia
    if (body.lat !== undefined) updateData.lat = body.lat
    if (body.lng !== undefined) updateData.lng = body.lng
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.statusDigital !== undefined) updateData.statusDigital = body.statusDigital
    if (body.score !== undefined) updateData.score = body.score
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.source !== undefined) updateData.source = body.source
    if (body.pipelineStage !== undefined) updateData.pipelineStage = body.pipelineStage
    if (body.lastContactAt !== undefined) updateData.lastContactAt = body.lastContactAt ? new Date(body.lastContactAt) : null
    if (body.contactCount !== undefined) updateData.contactCount = body.contactCount
    if (body.webVerified !== undefined) updateData.webVerified = body.webVerified
    if (body.webVerifiedAt !== undefined) updateData.webVerifiedAt = body.webVerifiedAt ? new Date(body.webVerifiedAt) : null
    if (body.webStatus !== undefined) updateData.webStatus = body.webStatus

    const hotel = await db.hotel.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ hotel })
  } catch (error) {
    console.error('[PUT /api/hotels/[id]]', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Hotel not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update hotel' },
      { status: 500 }
    )
  }
}

// DELETE /api/hotels/[id] — Delete a hotel by ID
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    // Check hotel exists
    const existing = await db.hotel.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      )
    }

    await db.hotel.delete({ where: { id } })

    return NextResponse.json({ success: true, deleted: id })
  } catch (error) {
    console.error('[DELETE /api/hotels/[id]]', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Hotel not found' },
          { status: 404 }
        )
      }
    }
    return NextResponse.json(
      { error: 'Failed to delete hotel' },
      { status: 500 }
    )
  }
}
