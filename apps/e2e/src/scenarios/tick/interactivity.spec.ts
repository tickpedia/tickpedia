import { test, expect } from '@playwright/test'

// Phase 4 carry-over: choropleth state cells are clickable links to
// /states/[slug] with native hover tooltips, and the hero chips jump
// to the in-page sections (#range, #diseases) instead of being
// inert spans. The danger chip carries a `title=` explainer.

const TICK_SLUG = 'blacklegged-tick'

test.describe('/ticks/[slug] — interactivity', () => {
  test('choropleth cells are <a> links to /states/[slug]', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    const choropleth = page.getByTestId('choropleth')
    await expect(choropleth).toBeVisible()
    // Pick a high-Lyme state — Maine is reliably established.
    const meCell = choropleth.locator('a[data-state-code="ME"]')
    await expect(meCell).toHaveAttribute('href', '/states/maine')
    // Multi-word slug check.
    const ncCell = choropleth.locator('a[data-state-code="NC"]')
    await expect(ncCell).toHaveAttribute('href', '/states/north-carolina')
  })

  test('choropleth cells expose a hover tooltip via SVG <title>', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    const meTitle = page.locator('a[data-state-code="ME"] title')
    const text = await meTitle.textContent()
    expect(text).toMatch(/Maine/)
    // Either "N counties established" or "no established counties".
    expect(text).toMatch(/(established|counties)/i)
  })

  test('"Carries N diseases" chip jumps to the diseases section', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    const chip = page.getByRole('link', { name: /Carries \d+ diseases?/ })
    await expect(chip).toHaveAttribute('href', '#diseases')
    // The diseases section has an id="diseases" so the anchor resolves.
    await expect(page.locator('section#diseases')).toBeVisible()
  })

  test('"Established · N counties" chip jumps to the range section', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    const chip = page.getByRole('link', { name: /Established · \d/ })
    await expect(chip).toHaveAttribute('href', '#range')
    await expect(page.locator('section#range')).toBeVisible()
  })

  test('danger chip carries an explainer title', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    // Match the chip itself by its label (which danger level depends
    // on the seed; blacklegged-tick ships as "high"). The title=
    // attribute is what we're asserting.
    const chip = page.locator('.tp-chip.danger-high').first()
    await expect(chip).toBeVisible()
    const title = await chip.getAttribute('title')
    expect(title).toMatch(/high danger/i)
    expect(title?.length).toBeGreaterThan(20)
  })
})
