import { NextRequest, NextResponse } from 'next/server'
import { runFullCollection } from '@/lib/automation'

// POST /api/cron/scheduled — Cron-style automation endpoint
// Can be called by an external cron service or scheduler to run the
// full automated collection cycle (search → verify → enrich).
export async function POST(request: NextRequest) {
  try {
    // Optional: verify a secret header to prevent unauthorized calls
    const authHeader = request.headers.get('x-cron-secret')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set in env, require matching header
    if (cronSecret && authHeader !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: invalid or missing x-cron-secret header' },
        { status: 401 }
      )
    }

    console.log('[CRON SCHEDULED] Starting full automated collection cycle...')

    const result = await runFullCollection()

    console.log(
      `[CRON SCHEDULED] Collection complete: searched=${result.searched}, added=${result.added}, verified=${result.verified}, enriched=${result.enriched}`
    )

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (error) {
    console.error('[CRON SCHEDULED] Error:', error)
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'Scheduled collection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
