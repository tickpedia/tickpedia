import { test, expect } from '@playwright/test'

// /404 + every unmatched URL — both render the canonical not-found
// surface (the App router delegates the fallback to NotFoundPage). The
// canonical link points at /404 in both cases so any indexed
// not-found URL consolidates onto a single noindex page.

test.describe('not-found · /404', () => {
  test('renders the eyebrow, H1, and the requested path', async ({ page }) => {
    await page.goto('/404')
    await expect(page.getByTestId('not-found-eyebrow')).toContainText(
      /404 · not in encyclopedia/i,
    )
    await expect(
      page.getByRole('heading', { level: 1, name: /not on the map/i }),
    ).toBeVisible()
    await expect(page.getByTestId('not-found-path')).toContainText('/404')
  })

  test('canonical link is /404', async ({ page }) => {
    await page.goto('/404')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/404')
  })

  test('emits a robots noindex meta tag', async ({ page }) => {
    await page.goto('/404')
    const robots = await page.locator('meta[name="robots"]').getAttribute('content')
    expect(robots ?? '').toMatch(/noindex/i)
  })

  test('chip rail surfaces popular destinations', async ({ page }) => {
    await page.goto('/404')
    const chips = page.locator('[data-testid="not-found-chips"] a.tp-chip')
    await expect(chips).toHaveCount(5)
    await expect(chips.filter({ hasText: 'Blacklegged tick' })).toHaveAttribute(
      'href',
      '/ticks/blacklegged-tick',
    )
    await expect(chips.filter({ hasText: 'Risk map' })).toHaveAttribute(
      'href',
      '/risk',
    )
  })

  test('global footer renders below the body', async ({ page }) => {
    await page.goto('/404')
    await expect(page.getByTestId('site-footer')).toBeVisible()
  })
})

test.describe('not-found · unmatched URL fallback', () => {
  // `/diseases/<slug>` matches the disease pattern in the URL contract,
  // so an unknown disease slug routes to DiseasePage's empty state, not
  // here. To exercise the unmatched fallback we need a path that
  // doesn't match any pattern at all.
  test('an unknown route renders the same component with the URL preserved', async ({ page }) => {
    await page.goto('/no-such-segment/definitely-not-a-route')
    await expect(page.getByTestId('not-found-eyebrow')).toBeVisible()
    await expect(page.getByTestId('not-found-path')).toContainText(
      '/no-such-segment/definitely-not-a-route',
    )
    // URL stays put — no redirect to home — so the user can fix a typo.
    expect(page.url()).toContain('/no-such-segment/definitely-not-a-route')
  })

  test('the unmatched fallback also canonicalises to /404', async ({ page }) => {
    await page.goto('/no-such-route')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/404')
  })
})
