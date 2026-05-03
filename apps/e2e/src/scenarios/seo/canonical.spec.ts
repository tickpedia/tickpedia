import { test, expect } from '@playwright/test'

// Canonical-link enforcement. Filled in as pages ship — today the
// substrate ships only the alias stubs and the static sitemap, so
// this file's only assertion is that the preview server responds.
// As real pages land, add per-kind cases asserting
// `<link rel="canonical">` matches the URL and that there's exactly
// one canonical per page.

test.describe('seo · canonical links', () => {
  test('preview server is up (placeholder until pages ship)', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.ok()).toBe(true)
  })

  test.skip('every canonical page declares <link rel="canonical"> matching its URL', async () => {
    // Filled when real pages land
  })
})
