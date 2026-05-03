# @tickpedia/e2e

Hermetic Playwright suite for `tickpedia.com`.

It does **not** depend on a running `pnpm dev`. Each invocation builds
`apps/web` and serves the static output on `127.0.0.1:4173` (override
with `E2E_WEB_PORT`). When the run finishes the server is killed.

```bash
# one-time
pnpm --filter @tickpedia/e2e install-browsers

# run
pnpm e2e

# debug
pnpm e2e:ui
```

## Layout

```
src/
├── fixtures/              # shared, non-spec helpers
│   ├── canonical-urls.ts  # the URL contract, derived live from SemiLayer
│   └── page-reads.ts      # per page kind, the reads its component issues
├── scenarios/             # Playwright DOM specs, one folder per page family
│   ├── landing/landing.spec.ts
│   └── seo/{canonical,sitemap,jsonld,aliases,robots}.spec.ts
└── smoke/                 # node smoke scripts, no browser
    ├── semilayer-lenses.ts   # every lens / feed / analyze runs healthy
    └── semilayer-pages.ts    # every canonical URL's reads return data
```

## Adding scenarios

Drop a `*.spec.ts` under `src/scenarios/<page-family>/`. Tests share a
`baseURL` already pointing at the preview server. Playwright's
`testMatch` recurses, so no config change needed.

## The smoke scripts

```bash
# lens / feed / analyze health
pnpm --filter @tickpedia/e2e smoke:lenses

# every canonical URL's reads return data
pnpm --filter @tickpedia/e2e smoke:pages
```

Both load the repo-root `.env` for `SEMILAYER_SERVICE_URL` +
`NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY`.
