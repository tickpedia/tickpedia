import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

export type Db = ReturnType<typeof drizzle<typeof schema>>

export function connect(connectionString: string | undefined): Db {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to connect to Neon')
  }
  const sql = neon(connectionString)
  return drizzle(sql, { schema })
}
