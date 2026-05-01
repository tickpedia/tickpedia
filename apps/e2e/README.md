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

## Adding scenarios

Drop a `*.spec.ts` under `src/`. Tests share a `baseURL` already pointing
at the preview server.
