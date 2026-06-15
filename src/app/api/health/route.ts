import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/health — Detailed health check for debugging Render issues
export async function GET() {
  const checks: Record<string, { status: string; detail?: string }> = {}
  let overallOk = true

  // Check 1: Database connection
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = { status: 'ok' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    checks.database = { status: 'error', detail: msg }
    overallOk = false
  }

  // Check 2: Hotel table accessible
  try {
    const count = await db.hotel.count()
    checks.hotels = { status: 'ok', detail: `${count} hotels` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    checks.hotels = { status: 'error', detail: msg }
    overallOk = false
  }

  // Check 3: User table accessible
  try {
    const count = await db.user.count()
    checks.users = { status: 'ok', detail: `${count} users` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    checks.users = { status: 'error', detail: msg }
  }

  // Check 4: CollectionLog table accessible
  try {
    const count = await db.collectionLog.count()
    checks.collectionLogs = { status: 'ok', detail: `${count} logs` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    checks.collectionLogs = { status: 'error', detail: msg }
  }

  // Check 5: Environment variables
  const envCheck: Record<string, boolean> = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
    ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
    CRON_SECRET: !!process.env.CRON_SECRET,
  }
  checks.environment = { status: 'ok', detail: JSON.stringify(envCheck) }

  return NextResponse.json({
    status: overallOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, { status: overallOk ? 200 : 503 })
}
