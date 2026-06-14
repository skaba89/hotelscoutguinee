import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { safeParseInt } from '@/lib/security'

// GET /api/hotels — List hotels with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Pagination with NaN protection (fixes M2)
    const page = safeParseInt(searchParams.get('page'), 1, 1, 10000)
    const limit = safeParseInt(searchParams.get('limit'), 20, 1, 100)
    const skip = (page - 1) * limit

    // Filters
    const city = searchParams.get('city')
    const region = searchParams.get('region')
    const stars = searchParams.get('stars')
    const priority = searchParams.get('priority')
    const pipelineStage = searchParams.get('pipelineStage')
    const statusDigital = searchParams.get('statusDigital')
    const hasWeb = searchParams.get('hasWeb')
    const hasBooking = searchParams.get('hasBooking')
    const hasTripadvisor = searchParams.get('hasTripadvisor')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

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
    if (hasWeb === 'true') where.web = { not: '' }
    if (hasWeb === 'false') where.web = { in: ['', 'null'] } // Handle both empty and null (fixes M3)
    if (hasBooking === 'true') where.hasBooking = true
    if (hasBooking === 'false') where.hasBooking = false
    if (hasTripadvisor === 'true') where.hasTripadvisor = true
    if (hasTripadvisor === 'false') where.hasTripadvisor = false

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

    // Validate sortBy to prevent injection
    const allowedSortFields = [
      'createdAt', 'updatedAt', 'name', 'city', 'region', 'stars',
      'score', 'priority', 'pipelineStage', 'priceUsd', 'rooms',
      'ratingBooking', 'ratingTripadvisor', 'reviewsBooking', 'reviewsTripadvisor',
    ]
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'

    const [hotels, total] = await Promise.all([
      db.hotel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [safeSortBy]: sortOrder },
        include: {
          _count: { select: { contacts: true, aiAnalyses: true, verificationLogs: true } },
        },
      }),
      db.hotel.count({ where }),
    ])

    return NextResponse.json({
      hotels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[GET /api/hotels]', error)
    // Return empty list instead of 500 — allows the UI to render
    return NextResponse.json({
      hotels: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      dbError: true,
    })
  }
}

// POST /api/hotels — Create a new hotel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Required fields
    if (!body.name || !body.city || !body.region) {
      return NextResponse.json(
        { error: 'Name, city, and region are required' },
        { status: 400 }
      )
    }

    // ── Input validation (same rules as PUT) ──
    const VALID_PRIORITIES = ['hot', 'warm', 'cold']
    const VALID_PIPELINE_STAGES = ['nouveau', 'contacte', 'interesse', 'proposal', 'client']
    const VALID_DIGITAL_STATUSES = ['ok', 'partial', 'none']
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (body.stars !== undefined && body.stars !== null) {
      const stars = Number(body.stars)
      if (isNaN(stars) || stars < 0 || stars > 5) {
        return NextResponse.json({ error: 'stars must be between 0 and 5' }, { status: 400 })
      }
      body.stars = stars
    }
    if (body.score !== undefined && body.score !== null) {
      const score = Number(body.score)
      if (isNaN(score) || score < 0 || score > 100) {
        return NextResponse.json({ error: 'score must be between 0 and 100' }, { status: 400 })
      }
      body.score = score
    }
    if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` }, { status: 400 })
    }
    if (body.pipelineStage !== undefined && !VALID_PIPELINE_STAGES.includes(body.pipelineStage)) {
      return NextResponse.json({ error: `pipelineStage must be one of: ${VALID_PIPELINE_STAGES.join(', ')}` }, { status: 400 })
    }
    if (body.statusDigital !== undefined && !VALID_DIGITAL_STATUSES.includes(body.statusDigital)) {
      return NextResponse.json({ error: `statusDigital must be one of: ${VALID_DIGITAL_STATUSES.join(', ')}` }, { status: 400 })
    }
    if (body.email !== undefined && body.email !== null && body.email !== '' && !EMAIL_REGEX.test(body.email)) {
      return NextResponse.json({ error: 'email format is invalid' }, { status: 400 })
    }
    if (body.rooms !== undefined && body.rooms !== null) {
      const rooms = Number(body.rooms)
      if (isNaN(rooms) || rooms < 0) {
        return NextResponse.json({ error: 'rooms must be a positive number' }, { status: 400 })
      }
      body.rooms = rooms
    }

    const hotel = await db.hotel.create({
      data: {
        name: body.name,
        city: body.city,
        region: body.region,
        address: body.address ?? null,
        quartier: body.quartier ?? null,
        stars: body.stars ?? 0,
        phone: body.phone ?? null,
        email: body.email ?? null,
        web: body.web ?? null,
        fb: body.fb ?? null,
        wa: body.wa ?? null,
        bookingUrl: body.bookingUrl ?? null,
        tripadvisorUrl: body.tripadvisorUrl ?? null,
        ratingBooking: body.ratingBooking ?? 0,
        reviewsBooking: body.reviewsBooking ?? 0,
        ratingTripadvisor: body.ratingTripadvisor ?? 0,
        reviewsTripadvisor: body.reviewsTripadvisor ?? 0,
        priceUsd: body.priceUsd ?? null,
        rooms: body.rooms ?? 0,
        amenities: body.amenities ?? null,
        hasBooking: body.hasBooking ?? false,
        hasTripadvisor: body.hasTripadvisor ?? false,
        hasAgoda: body.hasAgoda ?? false,
        hasExpedia: body.hasExpedia ?? false,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        notes: body.notes ?? null,
        statusDigital: body.statusDigital ?? 'none',
        score: body.score ?? 0,
        priority: body.priority ?? 'cold',
        source: body.source ?? null,
        pipelineStage: body.pipelineStage ?? 'nouveau',
        lastContactAt: body.lastContactAt ? new Date(body.lastContactAt) : null,
        contactCount: body.contactCount ?? 0,
      },
    })

    return NextResponse.json({ hotel }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/hotels]', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error' }, // Don't leak error.message (fixes M1)
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create hotel' },
      { status: 500 }
    )
  }
}
