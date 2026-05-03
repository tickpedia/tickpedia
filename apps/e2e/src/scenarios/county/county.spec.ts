import { test, expect } from '@playwright/test'

// /counties and /counties/[state]/[slug] family — canonical pages
// backed by real Beam reads against the live SemiLayer service.
// Uses Cumberland County, Maine as the seed slug — it's the highest-
// reporting county in the editorial seed.

const STATE_SLUG = 'maine'
const COUNTY_SLUG = 'cumberland'
const COUNTY_NAME = /cumberland county/i

test.describe('/counties', () => {
  test('renders the leaderboard with at least one row linking to a county and a state', async ({ page }) => {
    await page.goto('/counties')
    await expect(
      page.getByRole('heading', { level: 1, name: /top-100 counties/i }),
    ).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/counties')

    const table = page.getByTestId('counties-leaderboard-table')
    await expect(table).toBeVisible()
    const links = await table
      .getByRole('link')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href')))
    expect(links.some((h) => h && h.startsWith('/counties/'))).toBe(true)
    expect(links.some((h) => h && h.startsWith('/states/'))).toBe(true)
  })
})

test.describe('/counties/[state]/[slug]', () => {
  test('renders the H1 and canonical link', async ({ page }) => {
    await page.goto(`/counties/${STATE_SLUG}/${COUNTY_SLUG}`)
    await expect(page.getByRole('heading', { level: 1, name: COUNTY_NAME })).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com/counties/${STATE_SLUG}/${COUNTY_SLUG}`)
    await expect(page).toHaveTitle(/cumberland.*maine.*tickpedia/i)
  })

  test('hero links back to the parent state', async ({ page }) => {
    await page.goto(`/counties/${STATE_SLUG}/${COUNTY_SLUG}`)
    const stateLinks = page.getByRole('link', { name: /^maine$/i })
    await expect(stateLinks.first()).toHaveAttribute('href', `/states/${STATE_SLUG}`)
  })

  test('renders the disease totals section', async ({ page }) => {
    await page.goto(`/counties/${STATE_SLUG}/${COUNTY_SLUG}`)
    await expect(page.getByTestId('county-diseases')).toBeVisible()
  })

  test('renders the established-ticks section (empty seed acceptable)', async ({ page }) => {
    // tick_county may be sparse for some counties — assert the section
    // renders, and only validate cross-links when present.
    await page.goto(`/counties/${STATE_SLUG}/${COUNTY_SLUG}`)
    const section = page.getByTestId('county-ticks')
    await expect(section).toBeVisible()
    const links = section.getByRole('link')
    const count = await links.count()
    if (count > 0) {
      const hrefs = await links.evaluateAll((nodes) =>
        nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href')),
      )
      expect(hrefs.every((h) => h && h.startsWith('/ticks/'))).toBe(true)
    }
  })

  test('renders the neighbours sidebar with cross-links', async ({ page }) => {
    await page.goto(`/counties/${STATE_SLUG}/${COUNTY_SLUG}`)
    const sidebar = page.getByTestId('county-neighbours')
    await expect(sidebar).toBeVisible()
    // Wait for at least one neighbour row to materialize. Some are
    // links (resolved state slug), some are plain divs (unresolved) —
    // the test only requires the section to populate.
    const rowCount = await sidebar.locator('a, div').count()
    expect(rowCount).toBeGreaterThan(1)
  })

  test('renders the global footer', async ({ page }) => {
    await page.goto(`/counties/${STATE_SLUG}/${COUNTY_SLUG}`)
    await expect(page.getByTestId('site-footer')).toBeVisible()
  })

  test('not-found state for an unknown slug', async ({ page }) => {
    await page.goto(`/counties/${STATE_SLUG}/this-county-does-not-exist`)
    await expect(page.getByRole('heading', { name: /county not found/i })).toBeVisible()
  })

  test('breadcrumbs link back to the parent state and its counties sub-page', async ({ page }) => {
    await page.goto(`/counties/${STATE_SLUG}/${COUNTY_SLUG}`)
    await expect(
      page.getByRole('link', { name: /^counties$/i }).first(),
    ).toHaveAttribute('href', `/states/${STATE_SLUG}/counties`)
  })
})
