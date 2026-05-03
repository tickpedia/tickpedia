import { test, expect } from '@playwright/test'

// Pathogen page at narrow viewport. Asserts the hero stacks, choropleth
// fits, and the document doesn't horizontally scroll.

const PATHOGEN_SLUG = 'borrelia-burgdorferi'

test.use({ viewport: { width: 375, height: 720 } })

test.describe('/pathogens/[slug] — narrow viewport', () => {
  test('document does not horizontally overflow', async ({ page }) => {
    await page.goto(`/pathogens/${PATHOGEN_SLUG}`)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('hero h1 stays within viewport width', async ({ page }) => {
    await page.goto(`/pathogens/${PATHOGEN_SLUG}`)
    const h1 = page.getByRole('heading', { level: 1, name: /borrelia burgdorferi/i })
    await expect(h1).toBeVisible()
    const box = await h1.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.width).toBeLessThanOrEqual(375)
  })

  test('hero stacks (monogram, headline, at-a-glance all visible)', async ({ page }) => {
    await page.goto(`/pathogens/${PATHOGEN_SLUG}`)
    await expect(page.getByTestId('pathogen-hero')).toBeVisible()
    await expect(page.getByText(/at a glance/i)).toBeVisible()
  })

  test('range section choropleth fits within the viewport', async ({ page }) => {
    await page.goto(`/pathogens/${PATHOGEN_SLUG}`)
    const range = page.getByTestId('pathogen-range')
    await expect(range).toBeVisible()
    const choro = page.getByTestId('choropleth').first()
    const box = await choro.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.width).toBeLessThanOrEqual(375)
  })
})
