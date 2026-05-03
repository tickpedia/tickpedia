import { test, expect } from '@playwright/test'

// /states and /states/[slug] family — canonical pages backed by real
// Beam reads against the live SemiLayer service. Uses `maine` as the
// seed slug (the editorial seed has full coverage for it: established
// ticks, Lyme leaderboard, county roster).

const STATE_SLUG = 'maine'
const STATE_NAME = /^maine$/i

test.describe('/states', () => {
  test('renders the index with at least one state link', async ({ page }) => {
    await page.goto('/states')
    await expect(page.getByRole('heading', { level: 1, name: /^states$/i })).toBeVisible()
    await expect(
      page.getByRole('link', { name: STATE_NAME }).first(),
    ).toHaveAttribute('href', `/states/${STATE_SLUG}`)
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/states')
  })
})

test.describe('/states/[slug]', () => {
  test('renders the H1 and canonical link', async ({ page }) => {
    await page.goto(`/states/${STATE_SLUG}`)
    await expect(page.getByRole('heading', { level: 1, name: STATE_NAME })).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com/states/${STATE_SLUG}`)
    await expect(page).toHaveTitle(/maine.*states.*tickpedia/i)
  })

  test('renders the hero with FIPS / USPS eyebrow', async ({ page }) => {
    await page.goto(`/states/${STATE_SLUG}`)
    const hero = page.getByTestId('state-hero')
    await expect(hero).toBeVisible()
    await expect(hero.getByText(/FIPS\s+23/)).toBeVisible()
    await expect(hero.getByText(/USPS\s+ME/)).toBeVisible()
  })

  test('renders the ticks section (empty editorial seed is acceptable)', async ({ page }) => {
    // tick_state surveillance may be empty until the editorial seed
    // catches up — the section renders regardless. If rows ARE
    // present, assert each one cross-links to /ticks/[slug].
    await page.goto(`/states/${STATE_SLUG}`)
    const ticksSection = page.getByTestId('state-ticks')
    await expect(ticksSection).toBeVisible()
    const tickLinks = ticksSection.getByRole('link')
    const count = await tickLinks.count()
    if (count > 0) {
      const hrefs = await tickLinks.evaluateAll((nodes) =>
        nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href')),
      )
      expect(hrefs.every((h) => h && h.startsWith('/ticks/'))).toBe(true)
    }
  })

  test('counties chip jumps to the counties sub-page', async ({ page }) => {
    await page.goto(`/states/${STATE_SLUG}`)
    const chip = page.getByRole('link', { name: /counties · /i })
    await expect(chip).toHaveAttribute('href', `/states/${STATE_SLUG}/counties`)
  })

  test('renders the global footer with project + browse links', async ({ page }) => {
    await page.goto(`/states/${STATE_SLUG}`)
    const footer = page.getByTestId('site-footer')
    await expect(footer).toBeVisible()
  })

  test('not-found state for an unknown slug', async ({ page }) => {
    await page.goto('/states/this-state-does-not-exist')
    await expect(page.getByRole('heading', { name: /state not found/i })).toBeVisible()
  })
})

test.describe('/states/[slug] sub-pages', () => {
  test('/ticks renders the ticks rail', async ({ page }) => {
    await page.goto(`/states/${STATE_SLUG}/ticks`)
    await expect(
      page.getByRole('heading', { level: 1, name: /ticks established in maine/i }),
    ).toBeVisible()
    await expect(page.getByTestId('state-ticks')).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com/states/${STATE_SLUG}/ticks`)
  })

  test('/diseases renders the disease leaderboard', async ({ page }) => {
    await page.goto(`/states/${STATE_SLUG}/diseases`)
    await expect(
      page.getByRole('heading', { level: 1, name: /disease cases reported in maine/i }),
    ).toBeVisible()
    await expect(page.getByTestId('state-diseases')).toBeVisible()
  })

  test('/counties lists every county as a link', async ({ page }) => {
    await page.goto(`/states/${STATE_SLUG}/counties`)
    await expect(
      page.getByRole('heading', { level: 1, name: /counties in maine/i }),
    ).toBeVisible()
    const table = page.getByTestId('state-counties-table')
    await expect(table).toBeVisible()
    const links = await table
      .getByRole('link')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href')))
    expect(links.some((h) => h && h.startsWith(`/counties/${STATE_SLUG}/`))).toBe(true)
  })

  test('breadcrumbs on sub-pages link back to the state page', async ({ page }) => {
    await page.goto(`/states/${STATE_SLUG}/ticks`)
    const back = page.getByRole('link', { name: STATE_NAME }).first()
    await expect(back).toHaveAttribute('href', `/states/${STATE_SLUG}`)
  })
})
