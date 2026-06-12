import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/reservations/[id] — Get a single reservation
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const reservation = await db.reservation.findUnique({
      where: { id },
      include: {
        hotel: true,
        planningSteps: { orderBy: { order: 'asc' } },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    return NextResponse.json({ reservation })
  } catch (error) {
    console.error('[GET /api/reservations/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch reservation' }, { status: 500 })
  }
}

// PATCH /api/reservations/[id] — Update reservation status
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const existing = await db.reservation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.status) updateData.status = body.status
    if (body.guestName) updateData.guestName = body.guestName
    if (body.guestEmail !== undefined) updateData.guestEmail = body.guestEmail
    if (body.guestPhone !== undefined) updateData.guestPhone = body.guestPhone
    if (body.checkIn) updateData.checkIn = new Date(body.checkIn)
    if (body.checkOut) updateData.checkOut = new Date(body.checkOut)
    if (body.guests !== undefined) updateData.guests = body.guests
    if (body.roomType) updateData.roomType = body.roomType
    if (body.specialRequests !== undefined) updateData.specialRequests = body.specialRequests
    if (body.totalPrice !== undefined) updateData.totalPrice = body.totalPrice

    const reservation = await db.reservation.update({
      where: { id },
      data: updateData,
      include: {
        hotel: { select: { id: true, name: true, city: true, region: true } },
        planningSteps: { orderBy: { order: 'asc' } },
      },
    })

    return NextResponse.json({ reservation })
  } catch (error) {
    console.error('[PATCH /api/reservations/[id]]', error)
    return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 })
  }
}

// DELETE /api/reservations/[id] — Cancel a reservation
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const existing = await db.reservation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Soft delete by setting status to cancelled
    await db.reservation.update({
      where: { id },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({ success: true, message: 'Reservation cancelled' })
  } catch (error) {
    console.error('[DELETE /api/reservations/[id]]', error)
    return NextResponse.json({ error: 'Failed to cancel reservation' }, { status: 500 })
  }
}
