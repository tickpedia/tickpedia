import { test, expect } from '@playwright/test'

// /robots.txt is checked into apps/web/public and copied to dist by
// Vite. It must allow everything except /search, and point at the
// sitemap.

test.describe('seo · robots.txt', () => {
  test('serves a 200 with text content type', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.ok()).toBe(true)
    expect(res.headers()['content-type'] ?? '').toMatch(/text\/plain/i)
  })

  test('opens the index to all crawlers', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text()
    expect(body).toMatch(/User-agent:\s*\*/i)
    expect(body).toMatch(/Allow:\s*\//i)
  })

  test('blocks the search query surface from the index', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text()
    expect(body).toMatch(/Disallow:\s*\/search/i)
  })

  test('points at the absolute sitemap URL', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text()
    expect(body).toMatch(/Sitemap:\s*https:\/\/tickpedia\.com\/sitemap\.xml/)
  })
})
