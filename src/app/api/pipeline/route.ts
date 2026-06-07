import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const PIPELINE_STAGES = ['nouveau', 'contacte', 'interesse', 'proposal', 'client'] as const

export async function GET() {
  try {
    const hotels = await db.hotel.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    const stages = PIPELINE_STAGES.map((stage) => {
      const stageHotels = hotels.filter((h) => h.pipelineStage === stage)
      return {
        stage,
        label: stageLabel(stage),
        count: stageHotels.length,
        hotels: stageHotels,
      }
    })

    const totalHotels = hotels.length

    return NextResponse.json({ stages, totalHotels })
  } catch (error) {
    console.error('[Pipeline GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline data' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { hotelId, stage } = body

    if (!hotelId || !stage) {
      return NextResponse.json(
        { error: 'hotelId and stage are required' },
        { status: 400 }
      )
    }

    if (!PIPELINE_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${PIPELINE_STAGES.join(', ')}` },
        { status: 400 }
      )
    }

    const hotel = await db.hotel.findUnique({ where: { id: hotelId } })
    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      )
    }

    const previousStage = hotel.pipelineStage

    const updated = await db.hotel.update({
      where: { id: hotelId },
      data: {
        pipelineStage: stage,
        lastContactAt: stage === 'contacte' ? new Date() : hotel.lastContactAt,
      },
    })

    // If moving to "contacte", increment contact count
    if (stage === 'contacte' && previousStage !== 'contacte') {
      await db.hotel.update({
        where: { id: hotelId },
        data: { contactCount: { increment: 1 } },
      })
    }

    return NextResponse.json({
      hotel: updated,
      previousStage,
      newStage: stage,
    })
  } catch (error) {
    console.error('[Pipeline PUT] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update pipeline stage' },
      { status: 500 }
    )
  }
}

function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    nouveau: 'Nouveau',
    contacte: 'Contacté',
    interesse: 'Intéressé',
    proposal: 'Proposition',
    client: 'Client',
  }
  return labels[stage] ?? stage
}
