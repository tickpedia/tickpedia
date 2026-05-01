# Skill: run-e2e

The Playwright suite under `apps/e2e` is **hermetic**. It boots its own
preview server on a private port, runs, and tears down. You do NOT need
`pnpm dev` running.

## First-time setup

```bash
pnpm --filter @tickpedia/e2e install-browsers
```

(CI runs this automatically.)

## Run

```bash
pnpm e2e             # headless
pnpm e2e:ui          # Playwright UI mode
pnpm --filter @tickpedia/e2e test:headed   # watch the browser
```

## Override the port

If port 4173 is in use:
```bash
E2E_WEB_PORT=4400 pnpm e2e
```

## Debugging a failure

- **HTML report:** `apps/e2e/playwright-report/index.html` opens
  automatically on failure (CI uploads it as an artifact).
- **Trace viewer:** failures retain a trace and a video. Open with
  `pnpm dlx playwright show-trace apps/e2e/test-results/<...>/trace.zip`.
- **Step-through:** `pnpm e2e:ui` lets you re-run an individual test.

## When tests are flaky

Don't add retries first — the symptom is rarely the cause:
1. Use `getByRole` / `getByTestId`, not CSS selectors.
2. `await expect(...).toBeVisible()` instead of `waitForTimeout`.
3. If a test depends on data, seed it explicitly inside the test, don't
   rely on a previous test having created it.

## Don'ts

- Don't share a dev server with e2e. Hermetic only.
- Don't use absolute URLs in `page.goto`. The `baseURL` is already wired.
