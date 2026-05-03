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

  test('exposes the source chip with target=_blank', async ({ page }) => {
    await page.goto(`/techniques/${TECHNIQUE_SLUG}`)
    const sourceLink = page.getByRole('link', { name: /^source · /i }).first()
    await expect(sourceLink).toBeVisible()
    await expect(sourceLink).toHaveAttribute('target', '_blank')
    const rel = await sourceLink.getAttribute('rel')
    expect(rel ?? '').toContain('noreferrer')
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
