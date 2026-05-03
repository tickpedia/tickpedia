import { test, expect } from '@playwright/test'

// /facts and /facts/[slug] — canonical wild-fact pages backed by real
// Beam reads. The seed currently ships zero rows (page-data smoke is
// `emptyOk: true`); the index renders an empty-state message and the
// per-fact route 404s. When the editorial pass populates the table,
// the per-fact spec picks up automatically.

test.describe('/facts', () => {
  test('renders the index H1 and canonical link', async ({ page }) => {
    await page.goto('/facts')
    await expect(
      page.getByRole('heading', { level: 1, name: /wild facts/i }),
    ).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/facts')
    await expect(page).toHaveTitle(/wild facts.*tickpedia/i)
  })

  test('renders either populated rows or the empty-state copy', async ({ page }) => {
    await page.goto('/facts')

    const list = page.getByTestId('facts-index-list')
    const empty = page.getByText(/no facts yet/i).first()

    // One of these must be true; we don't know the seed state at runtime.
    const listVisible = await list.isVisible().catch(() => false)
    const emptyVisible = await empty.isVisible().catch(() => false)
    expect(listVisible || emptyVisible).toBe(true)

    if (listVisible) {
      // If populated, every row must link to /facts/[slug].
      const rows = page.getByTestId('facts-index-row')
      const count = await rows.count()
      expect(count).toBeGreaterThan(0)
      const firstLink = rows.first().getByRole('link').first()
      const href = await firstLink.getAttribute('href')
      expect(href ?? '').toMatch(/^\/facts\/[a-z0-9-]+$/)
    }
  })

  test('renders the global footer', async ({ page }) => {
    await page.goto('/facts')
    await expect(page.getByTestId('site-footer')).toBeVisible()
  })
})

test.describe('/facts/[slug]', () => {
  test('not-found state for an unknown slug', async ({ page }) => {
    await page.goto('/facts/this-fact-does-not-exist')
    await expect(page.getByRole('heading', { name: /fact not found/i })).toBeVisible()
  })

  test('renders a real fact when the seed has any', async ({ page }) => {
    await page.goto('/facts')
    const rows = page.getByTestId('facts-index-row')
    const count = await rows.count()
    test.skip(count === 0, 'wild_facts seed is empty — skipping per-slug spec')

    const firstLink = rows.first().getByRole('link').first()
    const href = await firstLink.getAttribute('href')
    expect(href).toMatch(/^\/facts\/[a-z0-9-]+$/)

    await page.goto(href!)

    // H1 and canonical
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com${href}`)

    // Hero exists.
    await expect(page.getByTestId('fact-hero')).toBeVisible()

    // Footer.
    await expect(page.getByTestId('site-footer')).toBeVisible()
  })
})
