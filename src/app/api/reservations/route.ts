import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { safeParseInt } from '@/lib/security'

// GET /api/reservations — List reservations with optional filters & pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const hotelId = searchParams.get('hotelId')
    const page = safeParseInt(searchParams.get('page'), 1, 1)
    const limit = safeParseInt(searchParams.get('limit'), 20, 1, 100)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (hotelId) where.hotelId = hotelId

    const [reservations, total] = await Promise.all([
      db.reservation.findMany({
        where,
        include: {
          hotel: { select: { id: true, name: true, city: true, region: true, stars: true, phone: true, email: true } },
          planningSteps: { orderBy: { order: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.reservation.count({ where }),
    ])

    return NextResponse.json({
      reservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[GET /api/reservations]', error)
    // Return empty list instead of 500 — allows the UI to render
    return NextResponse.json({
      reservations: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      dbError: true,
    })
  }
}

// POST /api/reservations — Create a new reservation with auto-generated planning steps
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.hotelId || !body.checkIn || !body.checkOut || !body.guestName) {
      return NextResponse.json(
        { error: 'hotelId, checkIn, checkOut, and guestName are required' },
        { status: 400 }
      )
    }

    const checkIn = new Date(body.checkIn)
    const checkOut = new Date(body.checkOut)

    if (checkOut <= checkIn) {
      return NextResponse.json(
        { error: 'checkOut must be after checkIn' },
        { status: 400 }
      )
    }

    // Calculate nights
    const diffMs = checkOut.getTime() - checkIn.getTime()
    const nights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))

    // Generate confirmation code
    const confirmationCode = `HS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Create reservation with planning steps in a transaction
    const reservation = await db.$transaction(async (tx) => {
      const res = await tx.reservation.create({
        data: {
          hotelId: body.hotelId,
          checkIn,
          checkOut,
          guests: body.guests ?? 1,
          roomType: body.roomType ?? 'standard',
          specialRequests: body.specialRequests ?? null,
          guestName: body.guestName,
          guestEmail: body.guestEmail ?? null,
          guestPhone: body.guestPhone ?? null,
          status: 'pending',
          confirmationCode,
          nights,
          totalPrice: body.totalPrice ?? 0,
        },
      })

      // Auto-generate 7 planning steps
      const planningSteps: { step: string; label: string; order: number; scheduledAt: Date; status?: string }[] = [
        { step: 'reservation', label: 'Réservation créée', order: 1, scheduledAt: new Date(), status: 'completed' },
        { step: 'confirmation', label: 'Confirmation envoyée', order: 2, scheduledAt: new Date(checkIn.getTime() - 3 * 24 * 60 * 60 * 1000) },
        { step: 'payment', label: 'Paiement validé', order: 3, scheduledAt: new Date(checkIn.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { step: 'checkin_reminder', label: 'Rappel check-in', order: 4, scheduledAt: new Date(checkIn.getTime() - 24 * 60 * 60 * 1000) },
        { step: 'checkin', label: 'Check-in', order: 5, scheduledAt: checkIn },
        { step: 'checkout', label: 'Check-out', order: 6, scheduledAt: checkOut },
        { step: 'feedback', label: 'Retour client', order: 7, scheduledAt: new Date(checkOut.getTime() + 24 * 60 * 60 * 1000) },
      ]

      for (const step of planningSteps) {
        await tx.planningStep.create({
          data: {
            reservationId: res.id,
            step: step.step,
            label: step.label,
            status: (step.status as string) ?? 'pending',
            scheduledAt: step.scheduledAt,
            completedAt: step.status === 'completed' ? new Date() : null,
            order: step.order,
          },
        })
      }

      return res
    })

    // Return the reservation with its planning steps
    const fullReservation = await db.reservation.findUnique({
      where: { id: reservation.id },
      include: {
        hotel: { select: { id: true, name: true, city: true, region: true, stars: true, phone: true, email: true } },
        planningSteps: { orderBy: { order: 'asc' } },
      },
    })

    return NextResponse.json({ reservation: fullReservation }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/reservations]', error)
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
  }
}
