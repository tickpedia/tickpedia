import { test, expect } from '@playwright/test'

// County page at narrow viewport. Hero stacks (sidebar drops below
// headline), leaderboard table wraps in overflow-x scroll, no
// horizontal overflow.

const STATE_SLUG = 'maine'
const COUNTY_SLUG = 'cumberland'

test.use({ viewport: { width: 375, height: 720 } })

test.describe('/counties/[state]/[slug] — narrow viewport', () => {
  test('document does not horizontally overflow', async ({ page }) => {
    await page.goto(`/counties/${STATE_SLUG}/${COUNTY_SLUG}`)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('hero h1 stays within viewport width', async ({ page }) => {
    await page.goto(`/counties/${STATE_SLUG}/${COUNTY_SLUG}`)
    const h1 = page.getByRole('heading', { level: 1, name: /cumberland county/i })
    await expect(h1).toBeVisible()
    const box = await h1.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.width).toBeLessThanOrEqual(375)
  })

  test('hero stacks (headline + neighbours both visible)', async ({ page }) => {
    await page.goto(`/counties/${STATE_SLUG}/${COUNTY_SLUG}`)
    await expect(page.getByTestId('county-hero')).toBeVisible()
    await expect(page.getByTestId('county-neighbours')).toBeVisible()
  })

  test('leaderboard table fits within the viewport', async ({ page }) => {
    await page.goto('/counties')
    const section = page.getByTestId('counties-leaderboard-table')
    await expect(section).toBeVisible()
    // The wrapper div has overflowX: auto, so the section's bounding
    // box clamps to the viewport even though the table inside scrolls.
    const wrapper = section.locator('xpath=..')
    const box = await wrapper.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.width).toBeLessThanOrEqual(375)
  })
})
