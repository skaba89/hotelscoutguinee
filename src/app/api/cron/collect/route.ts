import { NextResponse } from 'next/server'

// POST /api/cron/collect — DEPRECATED
// This endpoint has been removed. Use /api/cron/scheduled instead.
// Returns 410 Gone to indicate the resource is no longer available.
export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated and no longer available.',
      message: 'Please use POST /api/cron/scheduled instead.',
      migration: 'Replace any calls to /api/cron/collect with /api/cron/scheduled. The x-cron-secret header is still required.',
    },
    { status: 410 }
  )
}

// Also return 410 for any other methods
export async function GET() {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated and no longer available.',
      message: 'Please use POST /api/cron/scheduled instead.',
    },
    { status: 410 }
  )
}
