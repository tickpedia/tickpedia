import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'

// Hermetic: Playwright builds apps/web and serves it on a private port.
// We don't depend on `pnpm dev` running. CI and local share the exact
// same flow.

const PORT = Number(process.env.E2E_WEB_PORT ?? 4173)
// Vite preview binds to localhost by default. Stick with `localhost` so
// the URL probe and the test runner agree on the host.
const baseURL = `http://localhost:${PORT}`
const webRoot = resolve(import.meta.dirname, '..', 'web')

// Local fast loops:
//   E2E_SKIP_BUILD=1 — skip the apps/web rebuild and just serve the
//     existing dist/. Use after you've already built once and only
//     spec files have changed.
//   reuseExistingServer (non-CI) — if a preview is already serving
//     PORT, e2e attaches to it instead of booting its own.
const skipBuild = process.env.E2E_SKIP_BUILD === '1'
const previewCmd = `pnpm --filter @tickpedia/web preview --port ${PORT} --strictPort`
const buildAndPreviewCmd = `pnpm --filter @tickpedia/web build && ${previewCmd}`

export default defineConfig({
  testDir: resolve(import.meta.dirname, 'src'),
  testMatch: /.*\.spec\.ts$/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  ...(process.env.CI ? { workers: 2 } : {}),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Build once, then preview. Hermetic — no shared dev server in CI.
    command: skipBuild ? previewCmd : buildAndPreviewCmd,
    url: baseURL,
    // CI must always boot a fresh server (build artifacts can't be
    // trusted across runs). Locally, attach to whatever is already
    // listening on PORT — that's what makes `pnpm preview` + `pnpm e2e`
    // a fast inner loop.
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    // 5 minutes — the prerender pass writes ~3000 county pages
    // alongside every other static URL; ~60-90s on a warm tenant,
    // longer when SemiLayer caches are cold. Preview-only is seconds.
    timeout: skipBuild ? 30_000 : 300_000,
    cwd: resolve(import.meta.dirname, '..', '..'),
    env: {
      // Anything the preview server needs at runtime goes here.
      NODE_ENV: 'production',
    },
  },
})
