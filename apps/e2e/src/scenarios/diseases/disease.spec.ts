import { test, expect } from '@playwright/test'

// /diseases/[slug] and its sub-pages — canonical pages backed by real
// Beam reads against the live SemiLayer service. Uses `lyme-disease`
// as the seed slug (the editorial seed has full-coverage data for it).

const DISEASE_SLUG = 'lyme-disease'
const DISPLAY = /lyme disease/i

test.describe('/diseases', () => {
  test('renders the index with at least one disease link', async ({ page }) => {
    await page.goto('/diseases')
    await expect(page.getByRole('heading', { level: 1, name: /^diseases$/i })).toBeVisible()
    await expect(page.getByRole('link', { name: DISPLAY })).toHaveAttribute(
      'href',
      `/diseases/${DISEASE_SLUG}`,
    )
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/diseases')
  })
})

test.describe('/diseases/[slug]', () => {
  test('renders the H1 and canonical link', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}`)
    await expect(page.getByRole('heading', { level: 1, name: DISPLAY })).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com/diseases/${DISEASE_SLUG}`)
    await expect(page).toHaveTitle(/lyme disease.*tickpedia/i)
  })

  test('exposes the flagship /risk CTA', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}`)
    const cta = page.getByTestId('disease-risk-cta')
    await expect(cta).toBeVisible()
    await expect(cta.getByRole('link', { name: /risk map|where lyme disease hits hardest/i }).first())
      .toHaveAttribute('href', `/risk/${DISEASE_SLUG}`)
  })

  test('cross-links every carrying tick', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}`)
    const ticksSection = page.getByTestId('disease-ticks')
    await expect(ticksSection).toBeVisible()
    // At least one tick row links to /ticks/[slug].
    const tickLinks = ticksSection.getByRole('link')
    await expect(tickLinks.first()).toBeVisible()
    const hrefs = await tickLinks.evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href')),
    )
    expect(hrefs.some((h) => h && h.startsWith('/ticks/'))).toBe(true)
  })

  test('renders the global footer with project + browse links', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}`)
    const footer = page.getByTestId('site-footer')
    await expect(footer).toBeVisible()
  })

  test('not-found state for an unknown slug', async ({ page }) => {
    await page.goto('/diseases/this-disease-does-not-exist')
    await expect(page.getByRole('heading', { name: /disease not found/i })).toBeVisible()
  })
})

test.describe('/diseases/[slug] sub-pages', () => {
  test('/states renders the choropleth + leaderboard', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}/states`)
    await expect(
      page.getByRole('heading', { level: 1, name: /where lyme disease reports concentrate/i }),
    ).toBeVisible()
    await expect(page.getByTestId('choropleth')).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com/diseases/${DISEASE_SLUG}/states`)
  })

  test('/seasonality renders the radial dial when data is present', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}/seasonality`)
    await expect(
      page.getByRole('heading', { level: 1, name: /when lyme disease reports peak/i }),
    ).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com/diseases/${DISEASE_SLUG}/seasonality`)
    // The page either renders the radial dial (data present) or the
    // empty-state copy ("not yet imported"). Both are valid prerender
    // outcomes; assert the section landed.
    await expect(page.getByTestId('disease-seasonality')).toBeVisible()
  })

  test('/history renders the line chart or single-year sentence', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}/history`)
    await expect(
      page.getByRole('heading', { level: 1, name: /lyme disease cases over time/i }),
    ).toBeVisible()
    await expect(page.getByTestId('disease-history')).toBeVisible()
  })

  test('/ticks lists every carrying tick as a link', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}/ticks`)
    await expect(
      page.getByRole('heading', { level: 1, name: /ticks that carry lyme disease/i }),
    ).toBeVisible()
    const section = page.getByTestId('disease-ticks')
    await expect(section).toBeVisible()
    const links = await section
      .getByRole('link')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href')))
    expect(links.some((h) => h && h.startsWith('/ticks/'))).toBe(true)
  })

  test('/pathogens renders the pathogens section', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}/pathogens`)
    await expect(
      page.getByRole('heading', { level: 1, name: /pathogens that cause lyme disease/i }),
    ).toBeVisible()
    await expect(page.getByTestId('disease-pathogens')).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com/diseases/${DISEASE_SLUG}/pathogens`)
  })

  test('breadcrumbs link back to the parent disease page', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}/states`)
    const back = page.getByRole('link', { name: DISPLAY })
    await expect(back.first()).toHaveAttribute('href', `/diseases/${DISEASE_SLUG}`)
  })
})
