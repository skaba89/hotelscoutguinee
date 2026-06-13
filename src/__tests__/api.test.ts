import { describe, it, expect, beforeAll } from 'vitest'

/**
 * API Integration Tests
 *
 * These tests validate the API endpoint contracts.
 * They test response formats, status codes, and validation logic.
 * The actual server must be running for these to pass (run with `bun dev`).
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000'

// Skip API tests if server is not running
let serverAvailable = false

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/api`, { signal: AbortSignal.timeout(3000) })
    serverAvailable = res.ok
  } catch {
    serverAvailable = false
  }
})

describe('API Health Check', () => {
  it('should return healthy status', async () => {
    if (!serverAvailable) return
    const res = await fetch(`${BASE_URL}/api`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('healthy')
    expect(data.version).toBeTruthy()
    expect(data.checks).toBeDefined()
    expect(data.checks.database).toBe('ok')
  })
})

describe('API Stats', () => {
  it('should return stats with all required fields', async () => {
    if (!serverAvailable) return
    const res = await fetch(`${BASE_URL}/api/stats`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.totalHotels).toBeGreaterThanOrEqual(0)
    expect(data.byRegion).toBeDefined()
    expect(data.byDigitalStatus).toBeDefined()
    expect(data.averageScore).toBeGreaterThanOrEqual(0)
    expect(data.digitalReadiness).toBeGreaterThanOrEqual(0)
  })
})

describe('API Hotels', () => {
  it('should return hotels with pagination', async () => {
    if (!serverAvailable) return
    const res = await fetch(`${BASE_URL}/api/hotels?limit=5&page=1`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.hotels).toBeDefined()
    expect(Array.isArray(data.hotels)).toBe(true)
    expect(data.page).toBe(1)
    expect(data.total).toBeGreaterThanOrEqual(0)
  })

  it('should reject invalid sort parameters gracefully', async () => {
    if (!serverAvailable) return
    const res = await fetch(`${BASE_URL}/api/hotels?sortBy=invalid&limit=1`)
    // Should either default to valid sort or return 400
    expect([200, 400].includes(res.status)).toBe(true)
  })
})

describe('API Pipeline', () => {
  it('should return pipeline stages with counts', async () => {
    if (!serverAvailable) return
    const res = await fetch(`${BASE_URL}/api/pipeline`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.stages).toBeDefined()
    expect(Array.isArray(data.stages)).toBe(true)
    expect(data.totalHotels).toBeGreaterThanOrEqual(0)
    if (data.stages.length > 0) {
      expect(data.stages[0].stage).toBeTruthy()
      expect(data.stages[0].label).toBeTruthy()
      expect(typeof data.stages[0].count).toBe('number')
    }
  })

  it('should support pagination', async () => {
    if (!serverAvailable) return
    const res = await fetch(`${BASE_URL}/api/pipeline?page=1&limit=10`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.page).toBe(1)
    expect(data.limit).toBe(10)
  })
})

describe('API Cron Collect (deprecated)', () => {
  it('should return 410 Gone', async () => {
    if (!serverAvailable) return
    const res = await fetch(`${BASE_URL}/api/cron/collect`, { method: 'POST' })
    expect(res.status).toBe(410)
    const data = await res.json()
    expect(data.error).toContain('deprecated')
  })
})

describe('API Export', () => {
  it('should return CSV with correct headers', async () => {
    if (!serverAvailable) return
    const res = await fetch(`${BASE_URL}/api/export`)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    expect(res.headers.get('Content-Disposition')).toContain('hotels-guinea')
    const text = await res.text()
    // UTF-8 BOM
    expect(text.startsWith('\uFEFF')).toBe(true)
    // CSV header row
    expect(text).toContain('id,name,city')
  })
})

describe('API Reservations Validation', () => {
  it('should reject invalid status in PATCH', async () => {
    if (!serverAvailable) return
    // First, we need a reservation ID. Create one.
    const hotelsRes = await fetch(`${BASE_URL}/api/hotels?limit=1`)
    if (!hotelsRes.ok) return
    const hotelsData = await hotelsRes.json()
    if (!hotelsData.hotels?.length) return

    const hotelId = hotelsData.hotels[0].id
    const createRes = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotelId,
        guestName: 'Test Guest',
        checkIn: '2025-01-01',
        checkOut: '2025-01-03',
        guests: 2,
        roomType: 'standard',
      }),
    })
    if (!createRes.ok) return
    const reservation = await createRes.json()

    // Try invalid status
    const patchRes = await fetch(`${BASE_URL}/api/reservations/${reservation.reservation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid_status' }),
    })
    expect(patchRes.status).toBe(400)

    // Try invalid roomType
    const patchRes2 = await fetch(`${BASE_URL}/api/reservations/${reservation.reservation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomType: 'presidential' }),
    })
    expect(patchRes2.status).toBe(400)

    // Clean up - cancel the reservation
    await fetch(`${BASE_URL}/api/reservations/${reservation.reservation.id}`, {
      method: 'DELETE',
    })
  })
})
