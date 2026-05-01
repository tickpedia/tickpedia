import { test, expect } from '@playwright/test'

test.describe('tickpedia.com — landing', () => {
  test('renders the brand and tagline', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /tickpedia/i })).toBeVisible()
    await expect(page.getByTestId('tagline')).toContainText(/ticks by region/i)
  })

  test('has the open-source footer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/open source/i)).toBeVisible()
  })

  test('document title is set', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/tickpedia/i)
  })
})
