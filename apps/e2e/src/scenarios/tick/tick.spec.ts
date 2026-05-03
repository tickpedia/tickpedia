import { test, expect } from '@playwright/test'

// /ticks/[slug] and /ticks/[slug]/range — canonical pages backed by
// real Beam reads against the live SemiLayer service. Uses the
// `ixodes-scapularis` seed row, which ships with hero color, oneLiner,
// and county-level range data, so the assertions cover the full
// happy-path render.

const TICK_SLUG = 'blacklegged-tick'
const COMMON = /blacklegged tick/i

test.describe('/ticks/[slug]', () => {
  test('renders the H1, scientific name, and canonical link', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    await expect(page.getByRole('heading', { level: 1, name: COMMON })).toBeVisible()
    // Scientific name appears in two places: the TickCrest hero
    // labels it on the SVG ring, and the page body renders it under
    // the H1. Match the prose copy (the .tp-serif text node).
    await expect(page.locator('div.tp-serif', { hasText: /ixodes scapularis/i })).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com/ticks/${TICK_SLUG}`)
    await expect(page).toHaveTitle(/blacklegged tick.*tickpedia/i)
  })

  test('exposes a link to the /range sub-page', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    const rangeLink = page.getByRole('link', { name: /open full range/i })
    await expect(rangeLink).toBeVisible()
    await expect(rangeLink).toHaveAttribute('href', `/ticks/${TICK_SLUG}/range`)
  })

  test('range section right column shows a top-N states leaderboard', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    const summary = page.getByTestId('range-summary')
    await expect(summary).toBeVisible()
    // The leaderboard is a real <table> with a "Top N states" caption.
    await expect(summary.getByRole('table')).toBeVisible()
    await expect(summary.locator('caption')).toHaveText(/top \d+ states/i)
  })

  test('renders the global footer with project + browse links', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    const footer = page.getByTestId('site-footer')
    await expect(footer).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Sources' })).toHaveAttribute('href', '/sources')
    // Exact-match "About" — the lowercase "about" link in the
    // disclaimer strip points at /about#medical and would otherwise
    // collide with the column link.
    await expect(footer.getByRole('link', { name: /^About$/ })).toHaveAttribute('href', '/about')
    await expect(footer.getByRole('link', { name: /github\.com\/tickpedia/i })).toBeVisible()
  })

  test('not-found state for an unknown slug', async ({ page }) => {
    await page.goto('/ticks/this-tick-does-not-exist')
    await expect(page.getByRole('heading', { name: /tick not found/i })).toBeVisible()
  })

  test('renders the techniques section — removal, prevention, and aftercare', async ({
    page,
  }) => {
    await page.goto(`/ticks/${TICK_SLUG}`)
    const section = page.getByTestId('tick-techniques-section')
    await expect(section).toBeVisible()
    // The section either renders one+ rails (the JSON content import is
    // in place) or surfaces the editorial fallback link to /techniques.
    const removalRail = section.getByTestId('tick-techniques-removal')
    const fallback = section.getByTestId('tick-techniques-fallback-link')
    const railOrFallback = (await removalRail.count()) + (await fallback.count())
    expect(railOrFallback).toBeGreaterThanOrEqual(1)
  })
})

test.describe('/ticks/[slug]/range', () => {
  test('renders the focused range page with /range canonical', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}/range`)
    await expect(
      page.getByRole('heading', { level: 1, name: /where blacklegged tick is established/i }),
    ).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com/ticks/${TICK_SLUG}/range`)
  })

  test('breadcrumb links back to the parent tick page', async ({ page }) => {
    await page.goto(`/ticks/${TICK_SLUG}/range`)
    const back = page.getByRole('link', { name: COMMON })
    await expect(back.first()).toHaveAttribute('href', `/ticks/${TICK_SLUG}`)
  })
})
