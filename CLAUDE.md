# Tickpedia — Monorepo

A SemiLayer-powered, open-source web app: ticks by region, wild facts,
and how to remove them. Public site is no-backend; admin is a tiny
Next.js app behind a 2-person Clerk allowlist.

## Quick reference

- **Repo home:** `tickpedia/` (this directory)
- **Package manager:** pnpm 10 (workspaces)
- **Build system:** turborepo
- **Language:** TypeScript strict, everywhere
- **Test runner:** Vitest (unit) + Playwright (e2e, hermetic)
- **DB:** Neon Postgres (prod), local Postgres via `docker/` (dev)
- **ORM:** Drizzle, schema at `db/src/schema.ts`
- **Auth (admin only):** Clerk + email allowlist in middleware
- **Read-side intelligence:** SemiLayer (`sl.config.ts` → `generated/semilayer/`)
- **Public site host:** GitHub Pages → `tickpedia.com`
- **Admin host:** Vercel → `admin.tickpedia.com`

## Repo structure

```
tickpedia/
├── apps/
│   ├── web/         # tickpedia.com — Vite + React static build (GH Pages)
│   ├── admin/       # admin.tickpedia.com — Next.js + Clerk (Vercel)
│   └── e2e/         # Playwright, hermetic — boots its own preview server
├── db/              # @tickpedia/db — Drizzle schema, migrations, seed,
│                    #   Neon connection helper. The admin imports from here;
│                    #   the public site never does.
├── docker/          # local Postgres (compose)
├── generated/
│   └── semilayer/   # Beam client (generated; not committed)
├── skills/          # agent skill files referenced by agents.md
├── sl.config.ts     # SemiLayer lens config
├── agents.md        # entry point for coding agents
└── .github/workflows/
    ├── ci.yml             # lint, typecheck, test, build, e2e
    ├── deploy-pages.yml   # apps/web → GitHub Pages
    └── deploy-admin.yml   # apps/admin → Vercel preflight
```

## Common commands

```bash
pnpm install
pnpm db:setup:local       # boot Postgres + migrate + seed (one shot)
pnpm db:setup:remote      # migrate + seed against $DATABASE_URL (Neon)

pnpm dev                  # turbo dev across the workspace
pnpm test                 # vitest, every package
pnpm typecheck
pnpm build
pnpm e2e                  # hermetic Playwright (no dev server needed)

pnpm semilayer:push       # apply sl.config.ts to the SemiLayer service
pnpm semilayer:generate   # regen generated/semilayer
```

## Conventions

- **Reads from the public site go through SemiLayer.** Admin and scrape
  jobs talk to Drizzle directly. The browser never opens a Postgres
  connection.
- **Schema is centralized.** `db/src/schema.ts` is the single source of
  truth. The admin imports Drizzle types from `@tickpedia/db`. The
  public site never imports schema — its types come from the SemiLayer
  generated client (`generated/semilayer/`), which is derived from the
  same tables via `sl.config.ts`. One source, two consumers.
- **Admin allowlist is tested.** `apps/admin/src/lib/allowlist.ts` has
  unit coverage. Don't bypass it.
- **Tests live next to code.** `__tests__/` under each `src/`.
- **`.env` is gitignored.** `.env.example` is the source of truth for
  what's expected. Add to it whenever you add a key.
- **No emojis** in code or docs unless explicitly asked.
- **No `Co-Authored-By` trailer on commits.** Plain message bodies
  only — no AI / agent attribution lines.

## Bootstrap

Step-by-step key acquisition lives at `../plan/steps/01_bootstrap.md`.
That file is the human checklist for going from "fresh clone" to
"all green". Update it whenever the bootstrap changes.

## Skills

`agents.md` indexes a `skills/` folder of self-contained how-tos
(`add-a-page`, `add-a-lens`, `add-a-table`, `run-e2e`). When a
workflow shows up twice, write a skill for it.
