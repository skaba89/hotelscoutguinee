import { NextResponse } from 'next/server'
import { runFullCollection } from '@/lib/automation'

// POST /api/cron/collect — Run the full automated collection cycle
export async function POST() {
  try {
    const result = await runFullCollection()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Cron Collect POST] Error:', error)
    return NextResponse.json(
      {
        error: 'Data collection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
