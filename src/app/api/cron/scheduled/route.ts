import { NextResponse } from 'next/server'

// POST /api/cron/scheduled — Cron-style automation endpoint
// Can be called by an external cron service (with x-cron-secret header)
// or by the admin UI (with Bearer token). Auth is handled by middleware.
export async function POST() {
  try {
    console.log('[CRON SCHEDULED] Starting full automated collection cycle...')

    // Dynamic import to handle cases where automation module might fail
    const { runFullCollection } = await import('@/lib/automation')

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
    const errorMessage = error instanceof Error ? error.message : 'Scheduled collection failed'
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
