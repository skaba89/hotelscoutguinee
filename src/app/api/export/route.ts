import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { safeParseInt } from '@/lib/security'

// GET /api/export — Export hotels as streaming CSV with BOM for Excel UTF-8 compatibility
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const city = searchParams.get('city')
    const region = searchParams.get('region')
    const stars = searchParams.get('stars')
    const priority = searchParams.get('priority')
    const pipelineStage = searchParams.get('pipelineStage')
    const statusDigital = searchParams.get('statusDigital')
    const search = searchParams.get('search')

    // Build where clause
    const where: Prisma.HotelWhereInput = {}

    if (city) where.city = { contains: city }
    if (region) where.region = { contains: region }
    if (stars) {
      const starsNum = safeParseInt(stars, 0, 0, 5)
      if (starsNum > 0) where.stars = starsNum
    }
    if (priority) where.priority = priority
    if (pipelineStage) where.pipelineStage = pipelineStage
    if (statusDigital) where.statusDigital = statusDigital

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { city: { contains: search } },
        { region: { contains: search } },
        { address: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { web: { contains: search } },
      ]
    }

    // Use cursor-based pagination to stream in batches (memory-efficient)
    const BATCH_SIZE = 500
    const MAX_TOTAL = 10000

    // Define CSV columns matching the Hotel model
    const columns = [
      'id', 'name', 'city', 'region', 'address', 'quartier', 'stars',
      'phone', 'email', 'web', 'webVerified', 'webVerifiedAt', 'webStatus',
      'fb', 'wa', 'bookingUrl', 'tripadvisorUrl',
      'ratingBooking', 'reviewsBooking', 'ratingTripadvisor', 'reviewsTripadvisor',
      'priceUsd', 'rooms', 'amenities',
      'hasBooking', 'hasTripadvisor', 'hasAgoda', 'hasExpedia',
      'lat', 'lng', 'notes',
      'statusDigital', 'score', 'priority', 'source',
      'pipelineStage', 'lastContactAt', 'contactCount',
      'createdAt', 'updatedAt',
    ] as const

    const timestamp = new Date().toISOString().slice(0, 10)
    const filterParts: string[] = []
    if (city) filterParts.push(`city-${city}`)
    if (region) filterParts.push(`region-${region}`)
    if (priority) filterParts.push(priority)
    const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : ''
    const filename = `hotels-guinea${filterSuffix}_${timestamp}.csv`

    // Create a ReadableStream that yields CSV data in batches
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // UTF-8 BOM prefix for Excel compatibility
        controller.enqueue(encoder.encode('\uFEFF'))

        // Header row
        controller.enqueue(encoder.encode(columns.join(',') + '\n'))

        let cursor: string | undefined = undefined
        let totalExported = 0

        try {
          while (totalExported < MAX_TOTAL) {
            const hotels = await db.hotel.findMany({
              where,
              orderBy: { name: 'asc' },
              take: BATCH_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            })

            if (hotels.length === 0) break

            for (const hotel of hotels) {
              const row = columns.map((col) => {
                const value = hotel[col as keyof typeof hotel]

                if (value === null || value === undefined) return ''
                if (value instanceof Date) return escapeCsvField(value.toISOString())
                if (typeof value === 'boolean') return value ? 'true' : 'false'
                if (typeof value === 'number') return String(value)

                return escapeCsvField(String(value))
              }).join(',')

              controller.enqueue(encoder.encode(row + '\n'))
            }

            totalExported += hotels.length

            // If we got fewer than BATCH_SIZE, we've reached the end
            if (hotels.length < BATCH_SIZE) break

            // Set cursor for next batch
            cursor = hotels[hotels.length - 1].id
          }
        } catch (err) {
          console.error('[GET /api/export] Stream error:', err)
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[GET /api/export]', error)
    // Return a simple CSV header when the database is unavailable
    const columns = [
      'id', 'name', 'city', 'region', 'address', 'quartier', 'stars',
      'phone', 'email', 'web', 'webVerified', 'webVerifiedAt', 'webStatus',
      'fb', 'wa', 'bookingUrl', 'tripadvisorUrl',
      'ratingBooking', 'reviewsBooking', 'ratingTripadvisor', 'reviewsTripadvisor',
      'priceUsd', 'rooms', 'amenities',
      'hasBooking', 'hasTripadvisor', 'hasAgoda', 'hasExpedia',
      'lat', 'lng', 'notes',
      'statusDigital', 'score', 'priority', 'source',
      'pipelineStage', 'lastContactAt', 'contactCount',
      'createdAt', 'updatedAt',
    ] as const
    return new NextResponse('\uFEFF' + columns.join(',') + '\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="hotels-guinea_empty.csv"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  }
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
