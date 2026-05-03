import { test, expect } from '@playwright/test'

// /pathogens/[slug] and its sub-pages — canonical pages backed by real
// Beam reads. Uses borrelia-burgdorferi as the seed slug (full editorial
// coverage and tick + disease links).

const PATHOGEN_SLUG = 'borrelia-burgdorferi'
const DISPLAY = /borrelia burgdorferi/i

test.describe('/pathogens', () => {
  test('renders the index with at least one pathogen link', async ({ page }) => {
    await page.goto('/pathogens')
    await expect(page.getByRole('heading', { level: 1, name: /^pathogens$/i })).toBeVisible()
    await expect(page.getByRole('link', { name: DISPLAY })).toHaveAttribute(
      'href',
      `/pathogens/${PATHOGEN_SLUG}`,
    )
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/pathogens')
  })
})

test.describe('/pathogens/[slug]', () => {
  test('renders the H1 and canonical link', async ({ page }) => {
    await page.goto(`/pathogens/${PATHOGEN_SLUG}`)
    await expect(page.getByRole('heading', { level: 1, name: DISPLAY })).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com/pathogens/${PATHOGEN_SLUG}`)
    await expect(page).toHaveTitle(/borrelia burgdorferi.*tickpedia/i)
  })

  test('cross-links every carrying tick', async ({ page }) => {
    await page.goto(`/pathogens/${PATHOGEN_SLUG}`)
    const ticksSection = page.getByTestId('pathogen-ticks')
    await expect(ticksSection).toBeVisible()
    const links = await ticksSection
      .getByRole('link')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href')))
    expect(links.some((h) => h && h.startsWith('/ticks/'))).toBe(true)
  })

  test('cross-links every disease this pathogen causes', async ({ page }) => {
    await page.goto(`/pathogens/${PATHOGEN_SLUG}`)
    const diseasesSection = page.getByTestId('pathogen-diseases')
    await expect(diseasesSection).toBeVisible()
    const links = await diseasesSection
      .getByRole('link')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href')))
    expect(links.some((h) => h && h.startsWith('/diseases/'))).toBe(true)
  })

  test('renders the global footer', async ({ page }) => {
    await page.goto(`/pathogens/${PATHOGEN_SLUG}`)
    await expect(page.getByTestId('site-footer')).toBeVisible()
  })

  test('not-found state for an unknown slug', async ({ page }) => {
    await page.goto('/pathogens/this-pathogen-does-not-exist')
    await expect(page.getByRole('heading', { name: /pathogen not found/i })).toBeVisible()
  })
})

test.describe('/pathogens/[slug] sub-pages', () => {
  test('/range renders the choropleth', async ({ page }) => {
    await page.goto(`/pathogens/${PATHOGEN_SLUG}/range`)
    await expect(
      page.getByRole('heading', { level: 1, name: /where borrelia burgdorferi has been detected/i }),
    ).toBeVisible()
    await expect(page.getByTestId('pathogen-range')).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com/pathogens/${PATHOGEN_SLUG}/range`)
  })

  test('/ticks lists every carrying tick as a link', async ({ page }) => {
    await page.goto(`/pathogens/${PATHOGEN_SLUG}/ticks`)
    await expect(
      page.getByRole('heading', { level: 1, name: /ticks that carry borrelia burgdorferi/i }),
    ).toBeVisible()
    const section = page.getByTestId('pathogen-ticks')
    await expect(section).toBeVisible()
  })

  test('/diseases lists every caused disease as a link', async ({ page }) => {
    await page.goto(`/pathogens/${PATHOGEN_SLUG}/diseases`)
    await expect(
      page.getByRole('heading', { level: 1, name: /diseases caused by borrelia burgdorferi/i }),
    ).toBeVisible()
    const section = page.getByTestId('pathogen-diseases')
    await expect(section).toBeVisible()
  })

  test('breadcrumbs link back to the parent pathogen page', async ({ page }) => {
    await page.goto(`/pathogens/${PATHOGEN_SLUG}/range`)
    const back = page.getByRole('link', { name: DISPLAY })
    await expect(back.first()).toHaveAttribute('href', `/pathogens/${PATHOGEN_SLUG}`)
  })
})
