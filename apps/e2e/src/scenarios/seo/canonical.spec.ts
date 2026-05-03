import { test, expect } from '@playwright/test'

// Canonical-link enforcement. Each shipped page must declare exactly
// one `<link rel="canonical">` and it must match the public URL on
// tickpedia.com. New page kinds get their canonical added here.

const CANONICAL_CASES: ReadonlyArray<{ path: string; href: string }> = [
  {
    path: '/ticks/blacklegged-tick',
    href: 'https://tickpedia.com/ticks/blacklegged-tick',
  },
  {
    path: '/ticks/blacklegged-tick/range',
    href: 'https://tickpedia.com/ticks/blacklegged-tick/range',
  },
]

test.describe('seo · canonical links', () => {
  for (const { path, href } of CANONICAL_CASES) {
    test(`${path} declares exactly one canonical → ${href}`, async ({ page }) => {
      await page.goto(path)
      const links = page.locator('link[rel="canonical"]')
      await expect(links).toHaveCount(1)
      await expect(links).toHaveAttribute('href', href)
    })
  }
})
