# agents.md

Working agreement between humans and coding agents on the Tickpedia repo.

## TL;DR for agents

- **Monorepo:** pnpm + turborepo. Workspaces: `apps/*`, `db`.
- **Stack:** TypeScript strict everywhere, Vitest for unit tests, Playwright
  for e2e, Drizzle over Neon Postgres, SemiLayer for read-side intelligence,
  Clerk for admin auth (allowlisted).
- **Public site** lives at `apps/web` (Vite + React, deploys to GitHub Pages
  with a `CNAME` for `tickpedia.com`).
- **Admin** lives at `apps/admin` (Next.js + Clerk, deploys to Vercel for
  `admin.tickpedia.com`). Two-person allowlist enforced in middleware.
- **Schema** lives at `db/` (root). Edit `db/src/schema.ts`, then
  `pnpm db:generate` to produce SQL, `pnpm db:setup:remote` to apply +
  seed against Neon, or `pnpm db:setup:local` to do the same against
  the docker Postgres.
- **Local vs remote:** `pnpm db:setup:remote` uses the `DATABASE_URL` in
  `.env` (Neon). `pnpm db:setup:local` injects a localhost URL via
  `cross-env` so you don't need to swap `.env` to bounce between them.
- **Geography** is `US → State → County` keyed on FIPS codes.
  - `states` PK = 2-char FIPS (`'25'`), slug = full name slugified
    (`'massachusetts'`, `'north-carolina'`, `'district-of-columbia'`).
    USPS-code aliases (`/states/ma`) live in `apps/web/src/aliases.ts`.
  - `counties` PK = 5-char FIPS (`'25009'`), slug = name minus
    " County / Parish / Borough / Census Area / Municipality / City and
    Borough" (preserves the lowercase `' city'` marker for Virginia /
    Maryland independent cities so `Baltimore County` and `Baltimore
    city` get distinct slugs). Slugs are unique within a state.
  - Pre-seeded from the FCC FIPS file. Re-sync via:
    `curl -o db/src/seeds/data/fips.txt https://transition.fcc.gov/oet/info/maps/census/fips/fips.txt`
  - Surveillance counts (`disease_county_year`, `disease_month`) join on
    `county_fips`. State-level prevalence (editorial) lives in
    `tick_state`.
- **Reads vs writes:**
  - **Public site reads** → SemiLayer Beam client (`generated/semilayer/`).
    Never imports `@tickpedia/db`.
  - **Admin writes / reads** → Drizzle via `@tickpedia/db`.
  - **Scrape jobs (later)** → Drizzle via `@tickpedia/db`.

## Skills

Skills are how we encode the boring stuff so an agent can pick them up and
just do them. Each skill is a self-contained markdown file under `skills/`.

| Skill | When to use |
|---|---|
| [ship-a-step](./skills/ship-a-step.md) | "Ship step N" / "execute step N" — full-autonomy persona for shipping a planned step end-to-end (build, test, e2e, db sync, push) |
| [local-setup](./skills/local-setup.md) | Fresh clone → working dev loop. Start here. |
| [add-a-page](./skills/add-a-page.md) | Add a new route to `apps/web` end-to-end (route, test, e2e) |
| [add-a-lens](./skills/add-a-lens.md) | Expose a new table to the public site through a SemiLayer lens |
| [add-an-analyze](./skills/add-an-analyze.md) | Add a declarative aggregation (`analyses.*`) to a SemiLayer lens — when to precompute, refreshInterval picks, the field-mapping caveat |
| [add-a-table](./skills/add-a-table.md) | Drizzle schema → migration → seed → tests |
| [ingest-cdc-data](./skills/ingest-cdc-data.md) | Pull CDC FIPS-keyed surveillance data; wide→long; canonical disease slugs |
| [import-xlsx](./skills/import-xlsx.md) | The admin xlsx import path: 3 modes, idempotency contract, where to extend |
| [run-e2e](./skills/run-e2e.md) | The hermetic e2e flow + how to debug failures |
| [debug-admin](./skills/debug-admin.md) | Auth/allowlist/Vercel debugging for `admin.tickpedia.com` (start here when admin misbehaves) |

If a workflow shows up twice, write a skill for it. The next agent will
thank you.

## Conventions

- **Don't bypass the data layer.** Public reads → SemiLayer Beam. Admin
  reads/writes → Drizzle direct. Never `fetch()` Neon from the browser.
- **One env var per concern.** `.env.example` is the source of truth for
  what's expected. Add to it whenever you add a key.
- **Tests next to code.** `__tests__/` under each `src/` package.
- **No emojis in code or docs unless asked.**
- **No `Co-Authored-By` trailer on commits.** Write the message and
  stop. AI / agent attribution lines do not belong in this repo's
  history.

## Repo layout

```
tickpedia/
├── apps/
│   ├── web/         # tickpedia.com (Vite + React, GH Pages)
│   ├── admin/       # admin.tickpedia.com (Next.js + Clerk, Vercel)
│   └── e2e/         # Playwright (hermetic, builds + previews web)
├── db/              # @tickpedia/db — schema, migrations, seed, connect
├── docker/          # local Postgres compose
├── generated/
│   └── semilayer/   # Beam client (regenerated; not committed)
├── skills/          # agent skill files (the index above)
├── sl.config.ts     # SemiLayer lens config
└── .github/workflows/  # CI (test) + CD (Pages, Vercel)
```
