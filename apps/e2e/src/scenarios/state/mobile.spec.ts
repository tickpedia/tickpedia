import { test, expect } from '@playwright/test'

// State page at narrow viewport. Hero stacks, leaderboards fit, no
// horizontal overflow.

const STATE_SLUG = 'maine'

test.use({ viewport: { width: 375, height: 720 } })

test.describe('/states/[slug] — narrow viewport', () => {
  test('document does not horizontally overflow', async ({ page }) => {
    await page.goto(`/states/${STATE_SLUG}`)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('hero h1 stays within viewport width', async ({ page }) => {
    await page.goto(`/states/${STATE_SLUG}`)
    const h1 = page.getByRole('heading', { level: 1, name: /^maine$/i })
    await expect(h1).toBeVisible()
    const box = await h1.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.width).toBeLessThanOrEqual(375)
  })

  test('hero stacks (monogram, headline, at-a-glance all visible)', async ({ page }) => {
    await page.goto(`/states/${STATE_SLUG}`)
    await expect(page.getByTestId('state-hero')).toBeVisible()
    await expect(page.getByText(/at a glance/i)).toBeVisible()
  })

  test('worst-counties leaderboard fits within the viewport', async ({ page }) => {
    await page.goto(`/states/${STATE_SLUG}`)
    const section = page.getByTestId('state-county-hotspots')
    await expect(section).toBeVisible()
    const box = await section.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.width).toBeLessThanOrEqual(375)
  })
})
