# docker/

Local infra for development. Production lives on Neon (DB) and Vercel /
GitHub Pages (apps).

## What's here

- `docker-compose.yml` — Postgres 16 on host port **15432** (container
  internal stays 5432). The bumped host port avoids fighting a system
  Postgres install or another project on the default.

## Quickstart

```bash
pnpm db:up      # docker compose -f docker/docker-compose.yml up -d
pnpm db:down    # docker compose -f docker/docker-compose.yml down
pnpm db:logs    # docker compose -f docker/docker-compose.yml logs -f postgres
```

Then point `.env` at it:

```
DATABASE_URL=postgresql://tickpedia:tickpedia@localhost:15432/tickpedia
```

Apply migrations and seed:

```bash
pnpm --filter @tickpedia/db db:migrate
pnpm --filter @tickpedia/db db:seed
```

## Why both local Postgres *and* Neon?

- **Local** — fast, hermetic, offline-friendly, free. Good for unit tests
  and day-to-day iteration.
- **Neon** — what production runs on. Use a Neon dev branch when you need
  to test pgvector / Data API / branch-per-PR behavior. The connection
  string format is identical, so swapping `DATABASE_URL` is the only
  change.
