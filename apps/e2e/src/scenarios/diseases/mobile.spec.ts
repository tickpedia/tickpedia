import { test, expect } from '@playwright/test'

// Disease page at narrow viewport. Asserts the hero stacks, the
// choropleth fits, and the document doesn't horizontally scroll.

const DISEASE_SLUG = 'lyme-disease'

test.use({ viewport: { width: 375, height: 720 } })

test.describe('/diseases/[slug] — narrow viewport', () => {
  test('document does not horizontally overflow', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}`)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('hero h1 stays within viewport width', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}`)
    const h1 = page.getByRole('heading', { level: 1, name: /lyme disease/i })
    await expect(h1).toBeVisible()
    const box = await h1.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.width).toBeLessThanOrEqual(375)
  })

  test('hero stacks (monogram, headline, at-a-glance all visible)', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}`)
    await expect(page.getByTestId('disease-hero')).toBeVisible()
    await expect(page.getByText(/at a glance/i)).toBeVisible()
  })

  test('states section choropleth fits within the viewport', async ({ page }) => {
    await page.goto(`/diseases/${DISEASE_SLUG}`)
    await expect(page.getByTestId('disease-states')).toBeVisible()
    const choro = page.getByTestId('choropleth').first()
    const box = await choro.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.width).toBeLessThanOrEqual(375)
  })
})
