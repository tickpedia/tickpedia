import { test, expect } from '@playwright/test'

// `/` — Tickpedia home. Sections boot lazily from real lens reads; the
// hero + quickstart are static so they assert reliably regardless of
// seed contents.

test.describe('/', () => {
  test('renders the home H1 + canonical', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-page')).toBeVisible()
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /ticks, the diseases they carry/i,
      }),
    ).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/')
    await expect(page).toHaveTitle(/tickpedia/i)
  })

  test('hero hosts the search box and "see the full map" link', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-hero')).toBeVisible()
    // The home search is the universal search — searches across ticks,
    // diseases, techniques, states, and counties from one input.
    await expect(page.getByTestId('universal-search-input')).toBeVisible()
    await expect(page.getByRole('link', { name: /see the full map/i })).toHaveAttribute(
      'href',
      '/risk',
    )
  })

  test('quickstart cards link to the four pillar destinations', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-quickstart')).toBeVisible()
    await expect(
      page.getByRole('link', { name: /how to remove a tick/i }),
    ).toHaveAttribute('href', '/techniques/fine-tipped-tweezers')
    await expect(
      page.getByRole('link', { name: /state-by-state surveillance/i }),
    ).toHaveAttribute('href', '/states')
    await expect(
      page.getByRole('link', { name: /monthly seasonality/i }),
    ).toHaveAttribute('href', '/season')
  })

  test('stats footer + global footer render', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-stats-footer')).toBeVisible()
    await expect(page.getByTestId('site-footer')).toBeVisible()
  })

  test('universal search returns grouped results from multiple lenses', async ({ page }) => {
    await page.goto('/')
    const input = page.getByTestId('universal-search-input')
    await input.click()
    await input.fill('lyme')
    // The dropdown panel becomes visible once at least one lens
    // returns results. Real Beam reads can take a couple seconds.
    const panel = page.getByTestId('universal-search-panel')
    await expect(panel).toBeVisible({ timeout: 10_000 })
    // Lyme-disease should at minimum surface in the diseases group.
    await expect(panel.getByTestId('universal-search-section-diseases')).toBeVisible()
  })

  test('universal search input is mobile-typable (16px font, no zoom trap)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const input = page.getByTestId('universal-search-input')
    await expect(input).toBeVisible()
    // The 16px floor on the input font keeps iOS from auto-zooming the
    // viewport when the field gets focus — assert the rendered size.
    const fontSize = await input.evaluate(
      (el) => window.getComputedStyle(el).fontSize,
    )
    expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(16)
  })
})
