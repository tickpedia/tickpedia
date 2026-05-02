// Drizzle connection helper. Picks the right driver based on the
// connection string:
//
//   - Neon (HTTPS-style URL: `…neon.tech` or `?sslmode=require`)
//     → @neondatabase/serverless + drizzle/neon-http. Edge-compatible.
//
//   - Local Postgres (`localhost`, `127.0.0.1`, `postgres` Docker host)
//     → node-postgres + drizzle/node-postgres. Speaks the wire protocol
//       directly, so no Neon HTTP proxy required.
//
// The split keeps migrate / seed scripts working both against Docker
// Postgres and against Neon without the caller knowing which driver is
// in play.

import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

export type Db =
  | ReturnType<typeof drizzleNeon<typeof schema>>
  | ReturnType<typeof drizzlePg<typeof schema>>

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres'])

function isLocalUrl(connectionString: string): boolean {
  try {
    const u = new URL(connectionString)
    return LOCAL_HOSTS.has(u.hostname)
  } catch {
    return false
  }
}

export function connect(connectionString: string | undefined): Db {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to connect to the database')
  }
  if (isLocalUrl(connectionString)) {
    const pool = new pg.Pool({ connectionString })
    return drizzlePg(pool, { schema })
  }
  const sql = neon(connectionString)
  return drizzleNeon(sql, { schema })
}
