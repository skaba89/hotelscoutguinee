import { NextRequest, NextResponse } from 'next/server'
import { verifyHotelUrl, verifyAllUrls } from '@/lib/automation'

// POST /api/hotels/verify — Verify hotel web URLs using automation functions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hotelIds, verifyAll } = body as {
      hotelIds?: string[]
      verifyAll?: boolean
    }

    if (verifyAll) {
      // Use the batch verification automation
      const result = await verifyAllUrls()
      return NextResponse.json(result)
    }

    if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
      // Verify specific hotels, processing in batches of 5
      const results: Array<{
        hotelId: string
        status: string
        statusCode?: number
        responseMs?: number
      }> = []

      const BATCH_SIZE = 5
      for (let i = 0; i < hotelIds.length; i += BATCH_SIZE) {
        const batch = hotelIds.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.allSettled(
          batch.map(async (id) => {
            const result = await verifyHotelUrl(id)
            return { hotelId: id, ...result }
          })
        )
        for (const r of batchResults) {
          if (r.status === 'fulfilled') results.push(r.value)
        }
      }

      const okCount = results.filter((r) => r.status === 'ok').length
      const failedCount = results.filter((r) => r.status !== 'ok').length

      return NextResponse.json({
        verified: results.length,
        ok: okCount,
        failed: failedCount,
        results,
      })
    }

    return NextResponse.json(
      { error: 'Provide hotelIds array or set verifyAll to true' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[POST /api/hotels/verify]', error)
    return NextResponse.json(
      { error: 'Failed to verify hotel URLs' },
      { status: 500 }
    )
  }
}
