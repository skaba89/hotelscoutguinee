import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { safeParseInt } from '@/lib/security'

const PIPELINE_STAGES = ['nouveau', 'contacte', 'interesse', 'proposal', 'client'] as const

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = safeParseInt(searchParams.get('page'), 1, 1, 1000)
    const limit = safeParseInt(searchParams.get('limit'), 50, 1, 200)
    const skip = (page - 1) * limit

    // Use groupBy for counts (efficient, no hotel data loading)
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

    // Load hotel details with pagination per stage
    const hotels = await db.hotel.findMany({
      select: {
        id: true, name: true, city: true, region: true, stars: true,
        pipelineStage: true, score: true, priority: true, webVerified: true,
        statusDigital: true, phone: true, email: true, web: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    })

    const stagesWithHotels = stages.map(s => ({
      ...s,
      hotels: hotels.filter(h => h.pipelineStage === s.stage),
    }))

    return NextResponse.json({
      stages: stagesWithHotels,
      totalHotels,
      page,
      limit,
      hasMore: skip + hotels.length < totalHotels,
    })
  } catch (error) {
    console.error('[Pipeline GET] Error:', error)
    return NextResponse.json({ stages: [], dbError: true })
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
