import { test, expect } from '@playwright/test'

// Technique page at narrow viewport. Asserts the hero stacks and the
// document doesn't horizontally scroll.

const TECHNIQUE_SLUG = 'fine-tipped-tweezers'

test.use({ viewport: { width: 375, height: 720 } })

test.describe('/techniques/[slug] — narrow viewport', () => {
  test('document does not horizontally overflow', async ({ page }) => {
    await page.goto(`/techniques/${TECHNIQUE_SLUG}`)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('hero h1 stays within viewport width', async ({ page }) => {
    await page.goto(`/techniques/${TECHNIQUE_SLUG}`)
    const h1 = page.getByRole('heading', { level: 1, name: /fine-tipped tweezers/i })
    await expect(h1).toBeVisible()
    const box = await h1.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.width).toBeLessThanOrEqual(375)
  })

  test('hero stacks (headline, monogram, applies-to all visible)', async ({ page }) => {
    await page.goto(`/techniques/${TECHNIQUE_SLUG}`)
    await expect(page.getByTestId('technique-hero')).toBeVisible()
    await expect(page.getByTestId('technique-monogram')).toBeVisible()
    await expect(page.getByTestId('technique-applies-to')).toBeVisible()
  })

  test('steps section fits within the viewport', async ({ page }) => {
    await page.goto(`/techniques/${TECHNIQUE_SLUG}`)
    const steps = page.getByTestId('technique-steps')
    await expect(steps).toBeVisible()
    const box = await steps.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.width).toBeLessThanOrEqual(375)
  })
})
