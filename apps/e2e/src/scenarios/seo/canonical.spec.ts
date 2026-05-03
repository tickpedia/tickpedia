import { test, expect } from '@playwright/test'

// Canonical-link enforcement. Filled in as page families ship
// (phases 4-12). Phase 3's substrate ships only the alias stubs and
// the static sitemap; concrete page rendering lands later.
//
// Today's assertion: the existing root index renders SOMETHING (the
// design shim), as a sanity check that the preview server is alive.
// As pages ship, add per-kind cases asserting `<link rel="canonical">`
// matches the URL and that there's exactly one canonical per page.

test.describe('seo · canonical links', () => {
  test('preview server is up (placeholder until page families ship)', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.ok()).toBe(true)
  })

  test.skip('every canonical page declares <link rel="canonical"> matching its URL', async () => {
    // Filled in by phase 4 onward — needs real pages first.
  })
})
