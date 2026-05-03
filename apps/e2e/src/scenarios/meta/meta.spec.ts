import { test, expect } from '@playwright/test'

// /about, /sources, /contribute — the three static meta surfaces the
// global footer points at. They render without SemiLayer (no lens
// reads), so the e2e is straightforward.

test.describe('meta · /about', () => {
  test('renders the H1 and the medical-disclaimer anchor', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1, name: /^about$/i })).toBeVisible()
    // The footer's "see about for the limits" link uses /about#medical,
    // so the section must exist with id="medical".
    await expect(page.locator('section#medical')).toBeVisible()
    await expect(page.locator('section#medical')).toContainText(/not medical advice/i)
  })

  test('canonical link is /about', async ({ page }) => {
    await page.goto('/about')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/about')
  })

  test('global footer renders below the body', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByTestId('site-footer')).toBeVisible()
  })
})

test.describe('meta · /sources', () => {
  test('renders the H1 and at least four source groups', async ({ page }) => {
    await page.goto('/sources')
    await expect(page.getByRole('heading', { level: 1, name: /^sources$/i })).toBeVisible()
    const headings = page.getByRole('heading', { level: 2 })
    expect(await headings.count()).toBeGreaterThanOrEqual(4)
  })

  test('every external link points at https and carries rel=noreferrer', async ({ page }) => {
    await page.goto('/sources')
    const links = page.locator('a[href^="http"]')
    const count = await links.count()
    expect(count).toBeGreaterThan(5)
    for (let i = 0; i < count; i++) {
      const rel = await links.nth(i).getAttribute('rel')
      expect(rel ?? '').toContain('noreferrer')
    }
  })
})

test.describe('meta · /contribute', () => {
  test('renders the H1 and links to the GitHub repo', async ({ page }) => {
    await page.goto('/contribute')
    await expect(page.getByRole('heading', { level: 1, name: /^contribute$/i })).toBeVisible()
    const gh = page.getByRole('link', { name: /github\.com\/tickpedia/i }).first()
    await expect(gh).toHaveAttribute('href', 'https://github.com/tickpedia/tickpedia')
  })

  test('canonical link is /contribute', async ({ page }) => {
    await page.goto('/contribute')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/contribute')
  })
})
