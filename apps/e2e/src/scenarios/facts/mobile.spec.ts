import { test, expect } from '@playwright/test'

// Mobile audit for /facts and a representative /facts/[slug]. 375px
// viewport — the design's narrowest breakpoint per `art-mobile.jsx`.

const MOBILE_VIEWPORT = { width: 375, height: 800 }

test.use({ viewport: MOBILE_VIEWPORT })

test.describe('mobile @ 375px', () => {
  test('/facts has no horizontal overflow', async ({ page }) => {
    await page.goto('/facts')
    await expect(page.getByRole('heading', { level: 1, name: /wild facts/i })).toBeVisible()
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth
    })
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('a real fact page reflows without overflow', async ({ page }) => {
    await page.goto('/facts')
    const rows = page.getByTestId('facts-index-row')
    const count = await rows.count()
    test.skip(count === 0, 'wild_facts seed is empty — skipping per-slug mobile spec')

    const href = await rows.first().getByRole('link').first().getAttribute('href')
    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth
    })
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
