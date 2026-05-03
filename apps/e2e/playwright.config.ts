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
    // Build once, then preview. Hermetic — no shared dev server.
    command: `pnpm --filter @tickpedia/web build && pnpm --filter @tickpedia/web preview --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    // 5 minutes — the prerender pass writes ~3000 county pages
    // alongside every other static URL; ~60-90s on a warm tenant,
    // longer when SemiLayer caches are cold.
    timeout: 300_000,
    cwd: resolve(import.meta.dirname, '..', '..'),
    env: {
      // Anything the preview server needs at runtime goes here.
      NODE_ENV: 'production',
    },
  },
})
