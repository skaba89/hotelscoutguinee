import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/hotels/cities — Get all unique cities with hotel counts for autocomplete
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('q') || ''

    // Group by city and region, count hotels
    const hotels = await db.hotel.findMany({
      select: { city: true, region: true },
      where: search
        ? {
            OR: [
              { city: { contains: search } },
              { region: { contains: search } },
            ],
          }
        : undefined,
    })

    // Aggregate: city → { region, count }
    const cityMap = new Map<string, { city: string; region: string; count: number }>()
    for (const h of hotels) {
      const key = `${h.city}|${h.region}`
      const existing = cityMap.get(key)
      if (existing) {
        existing.count++
      } else {
        cityMap.set(key, { city: h.city, region: h.region, count: 1 })
      }
    }

    // Sort by count desc, then alphabetically
    const cities = [...cityMap.values()]
      .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))

    // Also get regions with counts
    const regionMap = new Map<string, number>()
    for (const h of hotels) {
      regionMap.set(h.region, (regionMap.get(h.region) || 0) + 1)
    }
    const regions = [...regionMap.entries()]
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count || a.region.localeCompare(b.region))

    return NextResponse.json({ cities, regions })
  } catch (error) {
    console.error('[GET /api/hotels/cities]', error)
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}
