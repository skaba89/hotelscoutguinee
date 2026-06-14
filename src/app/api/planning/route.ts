import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/planning — List planning steps for a reservation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('reservationId')

    if (!reservationId) {
      return NextResponse.json({ error: 'reservationId is required' }, { status: 400 })
    }

    const steps = await db.planningStep.findMany({
      where: { reservationId },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ steps })
  } catch (error) {
    console.error('[GET /api/planning]', error)
    return NextResponse.json({ steps: [], dbError: true })
  }
}

// PATCH /api/planning — Update a planning step status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { stepId, status, notes, scheduledAt } = body

    if (!stepId) {
      return NextResponse.json({ error: 'stepId is required' }, { status: 400 })
    }

    const existing = await db.planningStep.findUnique({ where: { id: stepId } })
    if (!existing) {
      return NextResponse.json({ error: 'Planning step not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) {
      updateData.status = status
      if (status === 'completed') {
        updateData.completedAt = new Date()
      }
    }
    if (notes !== undefined) updateData.notes = notes
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt)

    const step = await db.planningStep.update({
      where: { id: stepId },
      data: updateData,
    })

    // If step is completed, check if all steps are done for this reservation
    if (status === 'completed') {
      const allSteps = await db.planningStep.findMany({
        where: { reservationId: existing.reservationId },
      })
      const allCompleted = allSteps.every(s => s.status === 'completed')

      if (allCompleted) {
        await db.reservation.update({
          where: { id: existing.reservationId },
          data: { status: 'completed' },
        })
      }
    }

    return NextResponse.json({ step })
  } catch (error) {
    console.error('[PATCH /api/planning]', error)
    return NextResponse.json({ error: 'Failed to update planning step' }, { status: 500 })
  }
}

// POST /api/planning — Add a custom planning step
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reservationId, step, label, scheduledAt, order } = body

    if (!reservationId || !step || !label) {
      return NextResponse.json(
        { error: 'reservationId, step, and label are required' },
        { status: 400 }
      )
    }

    // Verify reservation exists
    const reservation = await db.reservation.findUnique({ where: { id: reservationId } })
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Get max order for this reservation
    const maxOrderStep = await db.planningStep.findFirst({
      where: { reservationId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const nextOrder = order ?? (maxOrderStep ? maxOrderStep.order + 1 : 1)

    const newStep = await db.planningStep.create({
      data: {
        reservationId,
        step,
        label,
        status: 'pending',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        order: nextOrder,
      },
    })

    return NextResponse.json({ step: newStep }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/planning]', error)
    return NextResponse.json({ error: 'Failed to create planning step' }, { status: 500 })
  }
}
