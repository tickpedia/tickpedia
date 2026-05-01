<div align="center">

# Tickpedia

**Ticks by region. Wild facts. How to get them off you.**

[![CI](https://github.com/tickpedia/tickpedia/actions/workflows/ci.yml/badge.svg)](https://github.com/tickpedia/tickpedia/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](./.nvmrc)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](./tsconfig.base.json)
[![Powered by SemiLayer](https://img.shields.io/badge/powered%20by-SemiLayer-8B5CF6)](https://github.com/semilayer/semilayer)
[![DB: Neon](https://img.shields.io/badge/DB-Neon%20Postgres-00E599?logo=postgresql&logoColor=white)](https://neon.tech)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

A weekend-scale, fully open-source web app — ticks by region, wild facts,
and how to remove them. Built in public to dogfood
[SemiLayer](https://github.com/semilayer/semilayer).

</div>

---

## Quickstart — clone and run in two commands

```bash
git clone https://github.com/tickpedia/tickpedia.git && cd tickpedia
pnpm install
pnpm db:setup:local        # docker postgres + migrate + seed
pnpm --filter @tickpedia/web dev    # → http://localhost:5173
```

That's the whole thing. The local Postgres comes seeded with **51
states**, **3,144 counties**, and **9 canonical CDC tick-borne
diseases**, plus a sample tick.

> Need the admin panel or remote SemiLayer? See
> [`skills/local-setup.md`](./skills/local-setup.md) for the longer
> walkthrough.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Public site (`apps/web`) | Vite + React 19 | Static build, GitHub Pages, no SSR needed |
| Admin (`apps/admin`) | Next.js 15 + Clerk | Vercel auto-deploy, 2-person email allowlist in middleware |
| Database | Neon Postgres (prod), Docker Postgres (dev) | Branching → free per-PR DBs; identical connection string format |
| ORM | Drizzle | Schema-as-code, type-safe migrations, reads + writes from admin |
| Read-side intelligence | SemiLayer | Search, similar, query, feeds — over the same Neon DB |
| E2E | Playwright (hermetic) | Builds + previews `apps/web` on its own port — no shared dev server |
| CI/CD | GitHub Actions | `ci.yml` gates lint/typecheck/test/build/e2e; `deploy-pages.yml` ships the public site |

## What's in here

```
tickpedia/
├── apps/
│   ├── web/          # tickpedia.com — Vite + React (GitHub Pages)
│   ├── admin/        # admin.tickpedia.com — Next.js + Clerk (Vercel)
│   └── e2e/          # Hermetic Playwright suite
├── db/               # Drizzle schema, migrations, seed (US → state → county)
├── docker/           # Local Postgres (compose)
├── generated/
│   └── semilayer/    # Typed Beam client (gitignored, regenerated)
├── skills/           # How-to runbooks for humans + agents
├── agents.md         # Working agreement + skills index
├── sl.config.ts      # SemiLayer lens / relation / feed config
└── .github/workflows # CI + Pages + Vercel
```

## Common commands

```bash
pnpm dev                  # all apps in dev mode
pnpm typecheck            # tsc across the workspace
pnpm test                 # vitest (unit)
pnpm e2e                  # playwright (hermetic — no dev server needed)
pnpm build                # production build of every app

pnpm db:up                # docker postgres
pnpm db:down
pnpm db:setup:local       # boot + migrate + seed against localhost
pnpm db:setup:remote      # migrate + seed against $DATABASE_URL (Neon)
pnpm db:generate          # drizzle-kit generate (schema → SQL migration)

pnpm semilayer:push       # apply sl.config.ts to the SemiLayer service
pnpm semilayer:generate   # regenerate ./generated/semilayer
```

## Project north star

Someone lands on the site, picks their region, and within ~5 seconds:

1. Sees the ticks that live there, with photos.
2. Reads one absolutely wild fact about each.
3. Knows exactly how to remove one.
4. Wants to text the link to a friend.

If that flow takes more than 5 seconds or more than 2 clicks, we cut
something. The longer pitch lives in [`CLAUDE.md`](./CLAUDE.md).

## Contributing

The project is open source under [MIT](./LICENSE). For now we're
shipping straight to `main` while we get the bones in place; once the
public site lands at `tickpedia.com`, contributions move to PRs gated
by CI. The skill files under `skills/` — starting with
[`local-setup`](./skills/local-setup.md) — are the canonical "how do
I do X". Start there.

## Acknowledgements

- [SemiLayer](https://github.com/semilayer/semilayer) for the read-side
  intelligence layer.
- [Neon](https://neon.tech) for branchable Postgres + free per-PR DBs.
- [FCC FIPS reference](https://transition.fcc.gov/oet/info/maps/census/fips/fips.txt)
  for the state + county seed data.
- [CDC tick-borne disease surveillance](https://www.cdc.gov/ticks/data-research/facts-stats/index.html)
  for the science.
