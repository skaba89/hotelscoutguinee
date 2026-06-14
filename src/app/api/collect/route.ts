import { NextRequest, NextResponse } from 'next/server'
import { runFullCollection } from '@/lib/automation'

// GET /api/collect — Check if collection endpoint is available
export async function GET() {
  return NextResponse.json({
    status: 'available',
    message: 'POST to this endpoint to run full collection cycle',
    queries: 80,
  })
}

// POST /api/collect — Run the full automated collection cycle
// Same-origin requests are allowed; external requests need CRON_SECRET
export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('x-cron-secret');
    const origin = (request.headers.get('origin') || '').toLowerCase();
    const referer = (request.headers.get('referer') || '').toLowerCase();
    const isSameOrigin = origin.includes('netlify.app') || origin.includes('localhost') || referer.includes('netlify.app') || referer.includes('localhost');

    if (cronSecret && !isSameOrigin && authHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Collect] Starting full automated collection cycle...')
    const result = await runFullCollection()
    console.log(`[Collect] Done: searched=${result.searched}, added=${result.added}, enriched=${result.enriched}`)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Collect] Error:', error)
    return NextResponse.json({ error: 'Data collection failed' }, { status: 500 })
  }
}
