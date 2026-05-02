import { defineConfig } from 'drizzle-kit'
import { config as loadDotenv } from 'dotenv'
import { resolve } from 'node:path'

// drizzle-kit doesn't support Node's --env-file flag, so load the root
// .env explicitly. drizzle-kit transpiles this file as CJS, so
// `import.meta.dirname` is empty — anchor on `process.cwd()` instead
// (drizzle-kit runs from the @tickpedia/db package dir, so `..` is the
// repo root).
loadDotenv({ path: resolve(process.cwd(), '..', '.env'), override: false })

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
