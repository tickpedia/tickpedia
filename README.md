# Tickpedia

> Ticks by region. Wild facts. How to get them off you.

A weekend-scale web app, fully open source, dogfooding
[SemiLayer](https://github.com/semilayer/semilayer) in public.

- **Public site:** [tickpedia.com](https://tickpedia.com) (GitHub Pages)
- **License:** MIT

## Quickstart

```bash
pnpm install
pnpm db:up           # docker postgres on :5432
pnpm db:migrate
pnpm db:seed
pnpm --filter @tickpedia/web dev      # public site → http://localhost:5173
pnpm --filter @tickpedia/admin dev    # admin       → http://localhost:3001
```

To get keys (Neon, Clerk, Vercel, GitHub Pages, SemiLayer), see
[`../plan/steps/01_bootstrap.md`](../plan/steps/01_bootstrap.md).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | All apps in dev mode |
| `pnpm test` | Vitest across every package |
| `pnpm e2e` | Hermetic Playwright suite |
| `pnpm typecheck` | tsc across the workspace |
| `pnpm build` | Production build for every app |
| `pnpm semilayer:push` | Apply `sl.config.ts` to the SemiLayer service |
| `pnpm semilayer:generate` | Regenerate the typed Beam client |
| `pnpm db:up` / `db:down` | Local Postgres lifecycle |

## Layout

See [`CLAUDE.md`](./CLAUDE.md) for the full repo tour. TL;DR:

```
apps/   web · admin · e2e
db/     schema · migrations · seed (Drizzle, used by admin)
docker/ local postgres
sl.config.ts → generated/semilayer (used by web)
skills/  +  agents.md
```

## Contributing

For now: straight to `main`. Once we open the repo, it'll move to PRs +
required CI checks (`ci.yml` already gates lint, typecheck, test, build,
and e2e).
