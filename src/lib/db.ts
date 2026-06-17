import { PrismaClient } from '@prisma/client'

/**
 * Ensure DATABASE_URL is in the format expected by Prisma SQLite.
 * On Render (or any PaaS), the user may accidentally set DATABASE_URL to a
 * Postgres-style URL (postgres://...) or a bare filesystem path, which Prisma
 * rejects with "the URL must start with the protocol `file:`".
 *
 * If the value does not start with `file:`, we rewrite it to a local SQLite
 * file inside a persistent data directory. This is a defensive runtime guard
 * that complements the render-start.sh script.
 */
function ensureValidDatabaseUrl(): void {
  const raw = process.env.DATABASE_URL
  if (raw && raw.startsWith('file:')) {
    return // Already valid
  }

  // Pick a persistent location. On Render, /opt/render/project/data is the
  // persistent disk. Locally, fall back to ./db/.
  const fs = require('fs')
  const path = require('path')
  const candidateDirs = [
    '/opt/render/project/data',
    path.join(process.cwd(), 'db'),
  ]
  const dataDir = candidateDirs.find((d) => {
    try {
      fs.mkdirSync(d, { recursive: true })
      fs.accessSync(d, fs.constants.W_OK)
      return true
    } catch {
      return false
    }
  }) || path.join(process.cwd(), 'db')

  const fixed = `file:${path.join(dataDir, 'hotelscout.db')}`
  if (raw) {
    console.warn(
      `[db] DATABASE_URL="${raw}" is not a valid SQLite URL. ` +
      `Falling back to "${fixed}".`
    )
  } else {
    console.warn(`[db] DATABASE_URL not set. Using "${fixed}".`)
  }
  process.env.DATABASE_URL = fixed
}

ensureValidDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

// In development, reuse the client across hot reloads
// In production, also cache globally to prevent multiple instances (fixes L5)
globalForPrisma.prisma = db

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}
