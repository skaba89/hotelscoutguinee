import { PrismaClient } from '@prisma/client'
import { SCHEMA_SQL } from '@/lib/schema-sql'

/**
 * Ensure DATABASE_URL is in the format expected by Prisma SQLite AND that the
 * target file is actually writable. On Render (or any PaaS), the env var may
 * be set to a Postgres-style URL, a bare filesystem path, or a path that the
 * standalone server process cannot write to. Prisma then fails with either
 * "the URL must start with the protocol `file:`" or "Unable to open the
 * database file" (SQLite error 14).
 *
 * Strategy:
 *   1. If DATABASE_URL is missing or doesn't start with `file:`, rewrite it.
 *   2. If DATABASE_URL is `file:<path>` but the parent dir is not writable,
 *      rewrite it to a writable location.
 *   3. Always ensure the parent directory exists and the DB file is touchable.
 */
function ensureValidDatabaseUrl(): void {
  const fs = require('fs')
  const path = require('path')
  const os = require('os')

  function tryWrite(filePath: string): boolean {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.closeSync(fs.openSync(filePath, 'a'))
      return true
    } catch {
      return false
    }
  }

  function pickWritableDbPath(): string {
    const fileName = 'hotelscout.db'
    const candidates = [
      '/opt/render/project/data',
      '/app/data',
      '/tmp',
      path.join(process.cwd(), 'data'),
      path.join(os.homedir(), '.hotelscout'),
    ]
    for (const dir of candidates) {
      const full = path.join(dir, fileName)
      if (tryWrite(full)) {
        return full
      }
    }
    // Last resort: cwd/data
    const fallback = path.join(process.cwd(), 'data', fileName)
    try {
      fs.mkdirSync(path.dirname(fallback), { recursive: true })
    } catch {
      // ignore
    }
    return fallback
  }

  const raw = process.env.DATABASE_URL || ''
  let resolvedPath = ''

  if (raw.startsWith('file:')) {
    resolvedPath = raw.slice('file:'.length)
    // Handle file:./relative paths — resolve against cwd
    if (resolvedPath.startsWith('./') || resolvedPath.startsWith('../')) {
      resolvedPath = path.resolve(resolvedPath)
    }
    if (!tryWrite(resolvedPath)) {
      console.warn(
        `[db] DATABASE_URL="${raw}" points to a non-writable location. ` +
        `Looking for a writable fallback...`
      )
      resolvedPath = pickWritableDbPath()
    }
  } else {
    if (raw) {
      console.warn(
        `[db] DATABASE_URL="${raw}" is not a valid SQLite URL. ` +
        `Looking for a writable fallback...`
      )
    } else {
      console.warn(`[db] DATABASE_URL not set. Looking for a writable location...`)
    }
    resolvedPath = pickWritableDbPath()
  }

  const fixed = `file:${resolvedPath}`
  if (fixed !== raw) {
    console.warn(`[db] Using DATABASE_URL="${fixed}"`)
    process.env.DATABASE_URL = fixed
  }
}

/**
 * Ensure all Prisma-managed tables exist in the database. This is a
 * programmatic fallback for when `prisma db push` fails on Render (which
 * happens silently when the build context can't find schema.prisma or when
 * npx prisma times out). We run the CREATE TABLE IF NOT EXISTS statements
 * directly via $executeRawUnsafe.
 *
 * Idempotent: safe to call on every server start.
 */
async function ensureSchema(db: PrismaClient): Promise<void> {
  try {
    // Quick probe: if Hotel table is queryable, schema already exists.
    await db.$queryRaw`SELECT 1 FROM "Hotel" LIMIT 1`
    return
  } catch {
    // Table doesn't exist — fall through to schema creation
    console.warn('[db] Hotel table missing. Running programmatic schema creation...')
  }

  try {
    // Split on semicolons that end statements (simple split works because
    // our DDL has no embedded semicolons in strings)
    const statements = SCHEMA_SQL
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))

    for (const stmt of statements) {
      try {
        await db.$executeRawUnsafe(stmt + ';')
      } catch (err) {
        // Ignore "already exists" errors (CREATE TABLE IF NOT EXISTS should
        // handle this, but be defensive about indexes too)
        const msg = err instanceof Error ? err.message : String(err)
        if (!/already exists/i.test(msg)) {
          console.warn('[db] Schema statement failed:', msg.slice(0, 120))
        }
      }
    }
    console.log(`[db] Schema creation complete (${statements.length} statements executed)`)

    // Verify
    try {
      const result = await db.$queryRaw`SELECT COUNT(*) as c FROM "Hotel"`
      console.log('[db] Schema verified: Hotel table accessible')
    } catch (err) {
      console.error('[db] Schema verification failed:', err)
    }
  } catch (err) {
    console.error('[db] Schema creation failed:', err)
  }
}

ensureValidDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaSchemaReady: Promise<void> | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

// In development, reuse the client across hot reloads
// In production, also cache globally to prevent multiple instances (fixes L5)
globalForPrisma.prisma = db

// Kick off schema creation in the background. We don't await this at module
// load time (would block the first request), but every API route that uses
// the DB will naturally wait for Prisma's own connection — and if the table
// is missing, the route will return an error until ensureSchema completes.
// Subsequent requests will succeed.
if (!globalForPrisma.prismaSchemaReady) {
  globalForPrisma.prismaSchemaReady = ensureSchema(db).catch((err) => {
    console.error('[db] ensureSchema threw:', err)
  })
}

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}
