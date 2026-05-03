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
    await expect(page.getByRole('searchbox', { name: /search ticks/i })).toBeVisible()
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
})
