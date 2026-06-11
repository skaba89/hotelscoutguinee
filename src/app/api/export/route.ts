import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

// GET /api/export — Export hotels as CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Support same filters as the list endpoint for targeted exports
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
    if (stars) where.stars = parseInt(stars, 10)
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

    const hotels = await db.hotel.findMany({
      where,
      orderBy: { name: 'asc' },
    })

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

    // Build CSV rows
    const headerRow = columns.join(',')
    const dataRows = hotels.map((hotel) => {
      return columns.map((col) => {
        const value = hotel[col as keyof typeof hotel]

        if (value === null || value === undefined) {
          return ''
        }

        if (value instanceof Date) {
          return escapeCsvField(value.toISOString())
        }

        if (typeof value === 'boolean') {
          return value ? 'true' : 'false'
        }

        if (typeof value === 'number') {
          return String(value)
        }

        return escapeCsvField(String(value))
      }).join(',')
    })

    const csv = [headerRow, ...dataRows].join('\n')

    // Generate filename with timestamp and filter info
    const timestamp = new Date().toISOString().slice(0, 10)
    const filterParts = []
    if (city) filterParts.push(`city-${city}`)
    if (region) filterParts.push(`region-${region}`)
    if (priority) filterParts.push(priority)
    const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : ''
    const filename = `hotels-guinea${filterSuffix}_${timestamp}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[GET /api/export]', error)
    return NextResponse.json(
      { error: 'Failed to export hotels' },
      { status: 500 }
    )
  }
}

/**
 * Escape a field value for CSV format (RFC 4180).
 * Wraps in double quotes if the value contains commas, quotes, or newlines.
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
