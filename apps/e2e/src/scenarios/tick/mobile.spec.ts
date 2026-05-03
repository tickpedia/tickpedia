import { test, expect } from '@playwright/test'

// Tick page at narrow viewport (iPhone SE-ish). Catches the carry-over
// from C3: nav links overflow without wrap, hero columns fixed at
// 240px / 1fr / 240px, h1 fixed at 56px, range grid 1.3fr / 1fr.
//
// Each assertion checks the *outcome* of the responsive CSS — that
// the H1 fits in viewport width and the structural sections render
// — rather than the exact computed-style value. That keeps the spec
// stable across token tweaks while still failing if a hardcoded grid
// returns.

const TICK_SLUG = 'blacklegged-tick'

test.use({ viewport: { width: 375, height: 720 } })

test.describe('/ticks/[slug] — narrow viewport', () => {
  test('nav links wrap without horizontal overflow', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    const navLinks = page.locator('.tp-nav-links')
    await expect(navLinks).toBeVisible()
    // Document doesn't horizontally scroll — flex-wrap + clamp keep
    // every link inside the viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('hero h1 stays within viewport width', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    const h1 = page.getByRole('heading', { level: 1, name: /blacklegged tick/i })
    await expect(h1).toBeVisible()
    const box = await h1.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.width).toBeLessThanOrEqual(375)
  })

  test('hero stacks (crest, headline, at-a-glance all visible)', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    await expect(page.getByTestId('tick-hero')).toBeVisible()
    // The "At a glance" sidebar should reflow under the headline,
    // not be clipped or hidden.
    await expect(page.getByText(/at a glance/i)).toBeVisible()
  })

  test('range section grid stacks; choropleth still renders', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    await expect(page.getByTestId('range-grid')).toBeVisible()
    await expect(page.getByTestId('choropleth')).toBeVisible()
    const box = await page.getByTestId('choropleth').boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.width).toBeLessThanOrEqual(375)
  })
})
