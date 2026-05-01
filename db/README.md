# @tickpedia/db

Database schema, migrations, and seed for Tickpedia. Lives outside `apps/` so
every consumer (public site, admin, scrape jobs, tests) reads from one source
of truth.

## Workflow

```bash
# 1. Edit src/schema.ts
# 2. Generate a migration
pnpm --filter @tickpedia/db db:generate

# 3. Apply against the Neon DB pointed to by DATABASE_URL
pnpm --filter @tickpedia/db db:migrate

# 4. Optional — seed dev data
pnpm --filter @tickpedia/db db:seed
```

`drizzle.config.ts` reads `DATABASE_URL` from your env. For per-PR ephemeral
DBs, point it at a Neon branch.
