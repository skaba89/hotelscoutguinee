import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { safeParseInt } from '@/lib/security'

// GET /api/export — Export hotels as CSV with BOM for Excel UTF-8 compatibility (fixes L3)
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

    // Limit results for safety (fixes H9 — memory)
    const hotels = await db.hotel.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 5000,
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

    // Build CSV rows with BOM for Excel UTF-8 (fixes L3)
    const headerRow = columns.join(',')
    const dataRows = hotels.map((hotel) => {
      return columns.map((col) => {
        const value = hotel[col as keyof typeof hotel]

        if (value === null || value === undefined) return ''
        if (value instanceof Date) return escapeCsvField(value.toISOString())
        if (typeof value === 'boolean') return value ? 'true' : 'false'
        if (typeof value === 'number') return String(value)

        return escapeCsvField(String(value))
      }).join(',')
    })

    // UTF-8 BOM prefix for Excel compatibility
    const csv = '\uFEFF' + [headerRow, ...dataRows].join('\n')

    const timestamp = new Date().toISOString().slice(0, 10)
    const filterParts: string[] = []
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

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
