import { test, expect } from '@playwright/test'

// `/risk` and `/risk/[disease-slug]` — the continental H3 risk map.
// The disease-filtered page canonicalizes back to /risk per the URL
// contract.

test.describe('/risk', () => {
  test('renders H1 + canonical', async ({ page }) => {
    await page.goto('/risk')
    await expect(page.getByTestId('risk-page')).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: /where tick-borne disease lives/i }),
    ).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/risk')
    await expect(page).toHaveTitle(/risk map.*tickpedia/i)
  })

  test('renders the heatmap section + disease chip rail', async ({ page }) => {
    await page.goto('/risk')
    await expect(page.getByTestId('risk-heatmap')).toBeVisible()
    await expect(page.getByTestId('risk-disease-chips')).toBeVisible()
  })

  test('renders the global footer', async ({ page }) => {
    await page.goto('/risk')
    await expect(page.getByTestId('site-footer')).toBeVisible()
  })
})

test.describe('/risk/[slug]', () => {
  test('canonicals back to /risk and self-titles', async ({ page }) => {
    await page.goto('/risk/lyme-disease')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/risk')

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    await expect(heading).toContainText(/lyme disease/i)
  })

  test('shows the "All diseases" back-link and an active chip', async ({ page }) => {
    await page.goto('/risk/lyme-disease')
    await expect(page.getByTestId('risk-back-all')).toBeVisible()
    const active = page.locator('a[aria-current="page"]')
    await expect(active.first()).toBeVisible()
  })

  test('not-found state for an unknown slug', async ({ page }) => {
    await page.goto('/risk/this-disease-does-not-exist')
    await expect(page.getByRole('heading', { name: /no such disease/i })).toBeVisible()
  })
})
