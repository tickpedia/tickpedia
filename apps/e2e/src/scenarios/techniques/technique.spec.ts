import { test, expect } from '@playwright/test'

// /techniques and /techniques/[slug] — canonical pages backed by real
// Beam reads against the live SemiLayer service. Uses
// `fine-tipped-tweezers` as the seed slug (the editorial seed has
// step text + a CDC source link for it).

const TECHNIQUE_SLUG = 'fine-tipped-tweezers'

test.describe('/techniques', () => {
  test('renders the index with at least one technique link', async ({ page }) => {
    await page.goto('/techniques')
    await expect(page.getByRole('heading', { level: 1, name: /^techniques$/i })).toBeVisible()
    await expect(
      page.getByRole('link', { name: /fine-tipped tweezers/i }).first(),
    ).toHaveAttribute('href', `/techniques/${TECHNIQUE_SLUG}`)
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe('https://tickpedia.com/techniques')
  })

  test('exposes a semantic search input and kind chip filters', async ({ page }) => {
    await page.goto('/techniques')
    await expect(page.getByTestId('techniques-search-input')).toBeVisible()
    await expect(page.getByTestId('techniques-kind-filter')).toBeVisible()
    // Five trait chips + the "All" chip.
    await expect(page.getByTestId('kind-chip-all')).toBeVisible()
    await expect(page.getByTestId('kind-chip-removal')).toBeVisible()
    await expect(page.getByTestId('kind-chip-prevention')).toBeVisible()
    await expect(page.getByTestId('kind-chip-aftercare')).toBeVisible()
    await expect(page.getByTestId('kind-chip-myth')).toBeVisible()
  })
})

test.describe('/techniques/[slug]', () => {
  test('renders the H1 and canonical link', async ({ page }) => {
    await page.goto(`/techniques/${TECHNIQUE_SLUG}`)
    await expect(
      page.getByRole('heading', { level: 1, name: /fine-tipped tweezers/i }),
    ).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://tickpedia.com/techniques/${TECHNIQUE_SLUG}`)
    await expect(page).toHaveTitle(/fine-tipped tweezers.*tickpedia/i)
  })

  test('renders parsed steps as an ordered list', async ({ page }) => {
    await page.goto(`/techniques/${TECHNIQUE_SLUG}`)
    const steps = page.getByTestId('technique-steps')
    await expect(steps).toBeVisible()
    // Seed has 4 steps; ordinals "01" and "02" must both be present.
    await expect(steps.getByText('01')).toBeVisible()
    await expect(steps.getByText('02')).toBeVisible()
  })

  test('exposes the citations bibliography with target=_blank', async ({ page }) => {
    await page.goto(`/techniques/${TECHNIQUE_SLUG}`)
    const citations = page.getByTestId('technique-citations')
    await expect(citations).toBeVisible()
    const cdcLink = citations.getByRole('link', { name: /cdc\.gov/i }).first()
    await expect(cdcLink).toBeVisible()
    await expect(cdcLink).toHaveAttribute('target', '_blank')
    const rel = await cdcLink.getAttribute('rel')
    expect(rel ?? '').toContain('noreferrer')
  })

  test('eyebrow is keyed off the kind trait, not slug-prefix matching', async ({ page }) => {
    await page.goto(`/techniques/${TECHNIQUE_SLUG}`)
    const eyebrow = page.getByTestId('technique-eyebrow')
    await expect(eyebrow).toBeVisible()
    await expect(eyebrow).toHaveAttribute('data-kind', 'removal')
  })

  test('renders the global footer with project + browse links', async ({ page }) => {
    await page.goto(`/techniques/${TECHNIQUE_SLUG}`)
    const footer = page.getByTestId('site-footer')
    await expect(footer).toBeVisible()
  })

  test('not-found state for an unknown slug', async ({ page }) => {
    await page.goto('/techniques/this-technique-does-not-exist')
    await expect(page.getByRole('heading', { name: /technique not found/i })).toBeVisible()
  })

  test('breadcrumbs link back to the techniques index', async ({ page }) => {
    await page.goto(`/techniques/${TECHNIQUE_SLUG}`)
    const back = page.getByRole('link', { name: /^techniques$/i }).first()
    await expect(back).toHaveAttribute('href', '/techniques')
  })
})
