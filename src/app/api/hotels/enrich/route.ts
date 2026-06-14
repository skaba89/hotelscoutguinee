import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { enrichHotelData } from '@/lib/automation'

// POST /api/hotels/enrich — Enrich hotel data using automation enrichment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hotelIds, enrichAllMissing, fields } = body as {
      hotelIds?: string[]
      enrichAllMissing?: boolean
      fields?: string[] // specific fields to enrich: ['phone', 'email', 'web']
    }

    // Validate target fields
    const targetFields = fields && fields.length > 0
      ? fields.filter((f: string) => ['phone', 'email', 'web'].includes(f))
      : ['phone', 'email', 'web']

    if (targetFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields specified for enrichment. Use: phone, email, web' },
        { status: 400 }
      )
    }

    // Determine which hotels to enrich
    let hotelIdsToEnrich: string[]

    if (enrichAllMissing) {
      const orConditions: Array<Record<string, null>> = []
      if (targetFields.includes('phone')) orConditions.push({ phone: null })
      if (targetFields.includes('email')) orConditions.push({ email: null })
      if (targetFields.includes('web')) orConditions.push({ web: null })

      const hotels = await db.hotel.findMany({
        where: { OR: orConditions },
        take: 50,
        select: { id: true },
      })
      hotelIdsToEnrich = hotels.map((h) => h.id)
    } else if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
      hotelIdsToEnrich = hotelIds
    } else {
      return NextResponse.json(
        { error: 'Provide hotelIds array or set enrichAllMissing to true' },
        { status: 400 }
      )
    }

    if (hotelIdsToEnrich.length === 0) {
      return NextResponse.json({
        enriched: 0,
        results: [],
        message: 'No hotels found to enrich',
      })
    }

    const results: Array<{
      hotelId: string
      enriched: boolean
      fields: string[]
      error?: string
    }> = []

    let enrichedCount = 0

    // Process hotels sequentially to respect API rate limits
    for (const id of hotelIdsToEnrich) {
      try {
        const result = await enrichHotelData(id)
        results.push({ hotelId: id, ...result })
        if (result.enriched) enrichedCount++
      } catch (hotelError) {
        results.push({
          hotelId: id,
          enriched: false,
          fields: [],
          error: hotelError instanceof Error ? hotelError.message : String(hotelError),
        })
      }
    }

    return NextResponse.json({
      totalProcessed: hotelIdsToEnrich.length,
      enriched: enrichedCount,
      notEnriched: hotelIdsToEnrich.length - enrichedCount,
      targetFields,
      results,
    })
  } catch (error) {
    console.error('[POST /api/hotels/enrich]', error)
    return NextResponse.json({ totalProcessed: 0, enriched: 0, notEnriched: 0, dbError: true })
  }
}
