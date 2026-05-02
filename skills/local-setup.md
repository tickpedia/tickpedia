# Skill: local-setup

The dreamy, no-friction path from `git clone` to a working dev loop.
This is what you point a new contributor at.

## TL;DR (2 commands)

```bash
pnpm install
pnpm db:setup:local      # docker postgres + migrate + seed
```

That's it. Then start whatever app you're working on:

```bash
pnpm --filter @tickpedia/web dev    # public site → http://localhost:5173
pnpm --filter @tickpedia/admin dev  # admin       → http://localhost:3001
pnpm e2e                            # Playwright (hermetic, builds its own server)
```

## Prereqs

| Tool | Min version | How to check |
|---|---|---|
| Node | 20.13.0 | `node -v` (`.nvmrc` pins this) |
| pnpm | 10.0.0 | `pnpm -v` |
| Docker Desktop | any recent | `docker --version` |

`fnm use` (or `nvm use`) picks up `.nvmrc` automatically.

## What `db:setup:local` does

1. `docker compose -f docker/docker-compose.yml up -d --wait` — boots
   Postgres 16 on `localhost:15432` and waits until the healthcheck
   passes. No race with the next step.
2. Applies Drizzle migrations from `db/migrations/` (whatever the
   committed schema requires).
3. Seeds the locations: 51 states + ~3,140 counties + 9 canonical
   diseases, plus a sample tick + state-prevalence + wild fact.

It runs fully against `localhost` — does **not** touch Neon. The
remote `DATABASE_URL` in `.env` is ignored for this command.

## When you also need the admin / SemiLayer side

Both are optional for working on the public site, but if you need them:

```bash
# 1. Fill in .env (copy .env.example if it isn't there yet).
cp .env.example .env
# 2. Edit .env — Clerk publishable + secret keys, semilayer keys.
# 3. For SemiLayer-backed dev (web app reads):
pnpm dlx @semilayer/cli login --service-url https://api.semilayer.com
pnpm dlx @semilayer/cli init     # writes .semilayerrc → org/project/env
pnpm semilayer:push              # apply sl.config.ts to the SemiLayer service
pnpm semilayer:generate          # regenerate ./generated/semilayer
```

`generated/semilayer/` is gitignored — every contributor regenerates
their own. Its TS will type-error if `sl.config.ts` is out of sync
with the deployed lenses; that's the signal to push.

## Verifying everything works

```bash
pnpm typecheck    # tsc --noEmit across the workspace
pnpm test         # vitest (unit, fast)
pnpm e2e          # Playwright (slower, hermetic)
pnpm build        # production build of every app
```

A clean clone goes:

| Command | Time |
|---|---|
| `pnpm install` | ~30s |
| `pnpm db:setup:local` | ~10s |
| `pnpm test` | ~5s |
| `pnpm e2e` | ~25s |
| `pnpm build` | ~30s |

If any of these gets noticeably slower, something's off — open an
issue rather than living with it.

## Redo from scratch

When state goes weird and you just want a clean slate:

```bash
pnpm db:down
docker volume rm docker_tickpedia_pg_data 2>/dev/null
pnpm db:setup:local
```

Or to wipe everything:

```bash
pnpm db:down
rm -rf node_modules .turbo apps/*/node_modules apps/*/.turbo \
       apps/*/dist apps/*/.next db/node_modules generated/semilayer
pnpm install
pnpm db:setup:local
pnpm semilayer:generate
```

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `DATABASE_URL is required` from migrate/seed | `.env` missing or unreadable | copy `.env.example` to `.env` |
| Postgres connection refused | docker container isn't up | `pnpm db:up` |
| Vitest can't resolve `@/beam` | ran tests before generating | `pnpm semilayer:generate` |
| `Cannot find module '@semilayer/client'` from `generated/` | new clone, deps not installed | `pnpm install` from repo root |
| Clerk `Missing publishableKey` at build | `.env` has placeholder | put real `pk_test_*` from Clerk dashboard, or skip admin |
| Search box returns nothing in dev | lenses haven't ingested | `pnpm exec semilayer status` — make sure each lens shows `ready` with vectors |
| Port 5173/3001/15432 already in use | a prior process didn't shut down | `lsof -i :<port>` and kill it |

## Local vs remote

- **Local** (`pnpm db:setup:local`) — Docker Postgres on `localhost:15432`. No
  network. Fast. Pgvector is **not** installed in this image, so any
  lens-side flows that hit the SemiLayer service won't return real
  embeddings against local data — that's expected.
- **Remote** (`pnpm db:setup:remote`) — uses whatever `DATABASE_URL` is
  in `.env`. For us that's Neon. SemiLayer is pointed at this DB, so
  this is the data the public site actually serves.

If you're working on the public site and want SemiLayer-backed search
to actually return rows in dev, point `apps/web` at the Neon-backed
SemiLayer (the default `NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY` already does
this — no work). If you're working on schema or admin, local is fine
and faster.
