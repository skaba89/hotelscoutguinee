import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const where: Record<string, unknown> = {}
    if (hotelId) where.hotelId = hotelId
    if (status) where.status = status
    if (channel) where.channel = channel

    const [contacts, total] = await Promise.all([
      db.contact.findMany({
        where,
        include: {
          hotel: {
            select: {
              id: true,
              name: true,
              city: true,
              pipelineStage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.contact.count({ where }),
    ])

    return NextResponse.json({ contacts, total, limit, offset })
  } catch (error) {
    console.error('[Contacts GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hotelId, channel, direction, subject, message, status } = body

    // Validate required fields
    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotelId is required' },
        { status: 400 }
      )
    }
    if (!channel) {
      return NextResponse.json(
        { error: 'channel is required' },
        { status: 400 }
      )
    }
    if (!direction) {
      return NextResponse.json(
        { error: 'direction is required' },
        { status: 400 }
      )
    }

    // Validate channel value
    const validChannels = ['email', 'whatsapp', 'phone', 'visit']
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate direction value
    const validDirections = ['outbound', 'inbound']
    if (!validDirections.includes(direction)) {
      return NextResponse.json(
        { error: `Invalid direction. Must be one of: ${validDirections.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate status if provided
    const validStatuses = ['sent', 'delivered', 'replied', 'converted']
    const contactStatus = status ?? 'sent'
    if (!validStatuses.includes(contactStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify hotel exists
    const hotel = await db.hotel.findUnique({ where: { id: hotelId } })
    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      )
    }

    const contact = await db.contact.create({
      data: {
        hotelId,
        channel,
        direction,
        subject: subject ?? null,
        message: message ?? null,
        status: contactStatus,
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            city: true,
            pipelineStage: true,
          },
        },
      },
    })

    // Update hotel's lastContactAt and contactCount
    await db.hotel.update({
      where: { id: hotelId },
      data: {
        lastContactAt: new Date(),
        contactCount: { increment: 1 },
      },
    })

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error('[Contacts POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}
