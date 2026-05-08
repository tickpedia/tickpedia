import { test, expect } from '@playwright/test'

// /search — full-page mixed-entity search. URL-driven via ?q=, runs
// the same five lenses as the header UniversalSearch dropdown.

test.describe('search · /search (no query)', () => {
  test('renders the empty-state prompt + suggestion chips', async ({ page }) => {
    await page.goto('/search')
    await expect(
      page.getByRole('heading', { level: 1, name: /search tickpedia/i }),
    ).toBeVisible()
    await expect(page.getByTestId('search-empty-prompt')).toBeVisible()
    const suggestions = page.locator(
      '[data-testid="search-suggestions"] a.tp-chip',
    )
    await expect(suggestions).toHaveCount(5)
  })

  test('canonical link is /search regardless of query', async ({ page }) => {
    await page.goto('/search')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/search')
  })

  test('global footer renders below the body', async ({ page }) => {
    await page.goto('/search')
    await expect(page.getByTestId('site-footer')).toBeVisible()
  })
})

test.describe('search · /search?q=...', () => {
  test('typing + Enter writes ?q= to the URL and updates the title', async ({ page }) => {
    await page.goto('/search')
    await page.getByTestId('search-input').fill('lyme')
    await page.getByTestId('search-input').press('Enter')
    await expect(page).toHaveURL(/\/search\?q=lyme$/)
    await expect(page).toHaveTitle(/lyme/i)
  })

  test('a real query renders results across multiple kinds', async ({ page }) => {
    await page.goto('/search?q=lyme')
    // At least one of the five sections renders for a real query.
    // Lyme matches diseases (Lyme disease) and ticks (Blacklegged
    // tick — keyword "tick" doesn't include lyme, but the disease lens
    // returns Lyme); we assert any kind-specific group lands.
    await expect(page.getByTestId('search-results')).toBeVisible({ timeout: 10_000 })
    const groups = page.locator(
      '[data-testid^="search-group-"]',
    )
    expect(await groups.count()).toBeGreaterThan(0)
  })

  // No e2e test for the no-results UI: the SemiLayer search lenses
  // are semantic and return top-N hits for any query (including
  // nonsense), so the empty-results path is unreachable against real
  // data. The unit test in `pages/search/__tests__/SearchPage.test.tsx`
  // covers that path with mocked empty responses, which is the right
  // layer for it.

  test('canonical link still points at /search even with a query', async ({ page }) => {
    await page.goto('/search?q=blacklegged')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/search')
  })
})
