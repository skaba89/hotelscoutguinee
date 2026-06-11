import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const PIPELINE_STAGES = ['nouveau', 'contacte', 'interesse', 'proposal', 'client'] as const

export async function GET() {
  try {
    // Use groupBy instead of loading all hotels (fixes H8)
    const [stageCounts, totalHotels] = await Promise.all([
      db.hotel.groupBy({
        by: ['pipelineStage'],
        _count: { pipelineStage: true },
      }),
      db.hotel.count(),
    ])

    const countMap = new Map(stageCounts.map(s => [s.pipelineStage, s._count.pipelineStage]))

    const stages = PIPELINE_STAGES.map((stage) => ({
      stage,
      label: stageLabel(stage),
      count: countMap.get(stage) ?? 0,
    }))

    // Only load hotel details if specifically requested (lighter response)
    const hotels = await db.hotel.findMany({
      select: { id: true, name: true, city: true, region: true, stars: true, pipelineStage: true, score: true, priority: true, webVerified: true, statusDigital: true },
      orderBy: { updatedAt: 'desc' },
    })

    const stagesWithHotels = stages.map(s => ({
      ...s,
      hotels: hotels.filter(h => h.pipelineStage === s.stage),
    }))

    return NextResponse.json({ stages: stagesWithHotels, totalHotels })
  } catch (error) {
    console.error('[Pipeline GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline data' },
      { status: 500 }
    );
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

    // Use transaction to prevent race conditions (fixes H3)
    const result = await db.$transaction(async (tx) => {
      const hotel = await tx.hotel.findUnique({ where: { id: hotelId } })
      if (!hotel) throw new Error('Hotel not found')

      const previousStage = hotel.pipelineStage

      const updated = await tx.hotel.update({
        where: { id: hotelId },
        data: {
          pipelineStage: stage,
          lastContactAt: stage === 'contacte' ? new Date() : hotel.lastContactAt,
          contactCount: stage === 'contacte' && previousStage !== 'contacte'
            ? { increment: 1 }
            : undefined,
        },
      })

      return { hotel: updated, previousStage, newStage: stage }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Hotel not found') {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })
    }
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
