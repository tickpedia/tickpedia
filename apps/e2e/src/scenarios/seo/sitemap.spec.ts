import { test, expect } from '@playwright/test'

// /sitemap.xml is generated at build time by
// `apps/web/scripts/generate-sitemap.ts`. With no SemiLayer key the
// build emits a static-only sitemap (no /ticks/[slug] entries); with
// a key it emits the full URL set. Either way the file must exist and
// contain at least the static URLs.

test.describe('seo · sitemap.xml', () => {
  test('serves a 200 with XML content type', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.ok()).toBe(true)
    const ct = res.headers()['content-type'] ?? ''
    expect(ct).toMatch(/(xml|text\/xml|application\/xml)/i)
  })

  test('declares the sitemaps.org schema', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    const body = await res.text()
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(body).toContain('</urlset>')
  })

  test('lists every static page (these ship even without SemiLayer)', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    const body = await res.text()
    for (const path of [
      '/',
      '/ticks',
      '/diseases',
      '/techniques',
      '/states',
      '/counties',
      '/facts',
      '/risk',
      '/season',
      '/sources',
      '/about',
      '/contribute',
    ]) {
      expect(body, `sitemap missing static URL ${path}`).toContain(`<loc>https://tickpedia.com${path}</loc>`)
    }
  })

  test('excludes noindex kinds — /search + /404 must not appear', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    const body = await res.text()
    expect(body, 'sitemap should not list /search').not.toContain(
      '<loc>https://tickpedia.com/search</loc>',
    )
    expect(body, 'sitemap should not list /404').not.toContain(
      '<loc>https://tickpedia.com/404</loc>',
    )
  })

  test('uses absolute URLs (Google rejects sitemap entries with relative locs)', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    const body = await res.text()
    // Every <loc> should contain an http(s) scheme.
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? '')
    expect(locs.length).toBeGreaterThan(0)
    for (const loc of locs) {
      expect(loc, `relative loc: ${loc}`).toMatch(/^https?:\/\//)
    }
  })
})
