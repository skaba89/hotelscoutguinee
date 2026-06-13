import { NextRequest, NextResponse } from 'next/server'
import { runFullCollection } from '@/lib/automation'

// POST /api/cron/collect — Run the full automated collection cycle
// @deprecated Use /api/cron/scheduled instead. This endpoint is kept for
// backward compatibility with existing integrations and will be removed in
// a future release.
export async function POST(request: NextRequest) {
  try {
    // Require CRON_SECRET for this endpoint (fixes H1)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('x-cron-secret');
    if (cronSecret && authHeader !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: invalid or missing x-cron-secret header' },
        { status: 401 }
      );
    }

    const result = await runFullCollection()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Cron Collect POST] Error:', error)
    return NextResponse.json(
      { error: 'Data collection failed' },
      { status: 500 }
    )
  }
}
