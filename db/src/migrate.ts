// Apply Drizzle migrations against DATABASE_URL.
// Run: pnpm --filter @tickpedia/db db:migrate

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { resolve } from 'node:path'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const sql = neon(url)
const db = drizzle(sql)

await migrate(db, { migrationsFolder: resolve(import.meta.dirname, '..', 'migrations') })
console.log('migrations applied')
