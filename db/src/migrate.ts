// Apply Drizzle migrations against DATABASE_URL.
// Run: pnpm --filter @tickpedia/db db:migrate
//
// Picks the matching driver based on the URL — Neon HTTPS for prod, raw
// pg for local Docker Postgres — so the same script works both ways.

import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import { resolve } from 'node:path'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const migrationsFolder = resolve(import.meta.dirname, '..', 'migrations')

function isLocal(connectionString: string): boolean {
  try {
    const u = new URL(connectionString)
    return ['localhost', '127.0.0.1', '::1', 'postgres'].includes(u.hostname)
  } catch {
    return false
  }
}

if (isLocal(url)) {
  const pool = new pg.Pool({ connectionString: url })
  const db = drizzlePg(pool)
  await migratePg(db, { migrationsFolder })
  await pool.end()
} else {
  const sql = neon(url)
  const db = drizzleNeon(sql)
  await migrateNeon(db, { migrationsFolder })
}

console.log('migrations applied')
