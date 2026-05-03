import { test, expect } from '@playwright/test'

// `/season` — radial monthly seasonality of tick-borne disease cases.

test.describe('/season', () => {
  test('renders H1 + canonical', async ({ page }) => {
    await page.goto('/season')
    await expect(page.getByTestId('season-page')).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: /when is tick season/i }),
    ).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/season')
    await expect(page).toHaveTitle(/tick season.*tickpedia/i)
  })

  test('renders the radial chart and per-disease list', async ({ page }) => {
    await page.goto('/season')
    await expect(page.getByTestId('season-radial')).toBeVisible()
    await expect(page.getByTestId('season-per-disease')).toBeVisible()
  })

  test('renders the global footer', async ({ page }) => {
    await page.goto('/season')
    await expect(page.getByTestId('site-footer')).toBeVisible()
  })
})
