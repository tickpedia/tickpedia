import { defineConfig } from 'drizzle-kit'
import { config as loadDotenv } from 'dotenv'
import { resolve } from 'node:path'

// drizzle-kit doesn't support Node's --env-file flag, so load the root
// .env explicitly. Local overrides (db:setup:local) set DATABASE_URL
// before invocation; that wins because we override: false.
loadDotenv({ path: resolve(import.meta.dirname, '..', '.env'), override: false })

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
