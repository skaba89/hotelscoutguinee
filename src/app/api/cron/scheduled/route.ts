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

    const hasErrors = result.errors && result.errors.length > 0
    console.log(
      `[CRON SCHEDULED] Collection ${hasErrors ? 'completed with errors' : 'complete'}: searched=${result.searched}, added=${result.added}, verified=${result.verified}, enriched=${result.enriched}`
    )
    if (hasErrors) {
      console.error('[CRON SCHEDULED] Errors:', result.errors)
    }

    return NextResponse.json({
      success: !hasErrors || result.added > 0 || result.enriched > 0,
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
        searched: 0,
        added: 0,
        verified: 0,
        enriched: 0,
        errors: [errorMessage],
        phases: {
          search: { queries: 12, succeeded: 0, failed: 12 },
          verify: { attempted: false, succeeded: false, error: errorMessage },
          enrich: { attempted: false, succeeded: false, hotelsFound: 0, error: errorMessage },
        },
      },
      { status: 500 }
    )
  }
}
