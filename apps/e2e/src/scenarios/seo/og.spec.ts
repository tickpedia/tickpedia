import { test, expect } from '@playwright/test'

// Per-page OG image — the contract from step 08.
//
// Each prerendered HTML carries a `<meta property="og:image">` tag.
// This spec asserts that:
//   1. Every reference page's HTML names a per-page OG path
//      (`/og/<canonical>.png`), not the legacy `/og-default.png`.
//   2. Each named PNG actually exists on disk and serves with
//      `Content-Type: image/png` + a non-trivial body.
//
// The bytes themselves aren't snapshotted — resvg's output isn't
// pinned across versions, and a "the image renders" assertion is the
// engineer's eyeball, not the test runner's.

interface OgCase {
  /** The page URL whose head we read. */
  page: string
  /** The OG image path the head should claim. */
  expectedOgPath: string
}

const OG_CASES: ReadonlyArray<OgCase> = [
  { page: '/',                                expectedOgPath: '/og/home.png' },
  { page: '/ticks/blacklegged-tick',          expectedOgPath: '/og/ticks/blacklegged-tick.png' },
  { page: '/ticks/lone-star-tick',            expectedOgPath: '/og/ticks/lone-star-tick.png' },
  { page: '/ticks/blacklegged-tick/range',    expectedOgPath: '/og/ticks/blacklegged-tick/range.png' },
  { page: '/diseases/lyme-disease',           expectedOgPath: '/og/diseases/lyme-disease.png' },
  { page: '/diseases/lyme-disease/states',    expectedOgPath: '/og/diseases/lyme-disease/states.png' },
  { page: '/techniques',                      expectedOgPath: '/og/techniques.png' },
  { page: '/techniques/fine-tipped-tweezers', expectedOgPath: '/og/techniques/fine-tipped-tweezers.png' },
  { page: '/states',                          expectedOgPath: '/og/states.png' },
  { page: '/states/maine',                    expectedOgPath: '/og/states/maine.png' },
  { page: '/states/maine/counties',           expectedOgPath: '/og/states/maine/counties.png' },
  { page: '/counties',                        expectedOgPath: '/og/counties.png' },
  { page: '/counties/maine/cumberland',       expectedOgPath: '/og/counties/maine/cumberland.png' },
  { page: '/facts',                           expectedOgPath: '/og/facts.png' },
]

test.describe('seo · og:image per page', () => {
  for (const c of OG_CASES) {
    test(`${c.page} claims ${c.expectedOgPath}`, async ({ request, baseURL }) => {
      const res = await request.get(c.page)
      expect(res.ok(), `${c.page} did not 200`).toBe(true)
      const body = await res.text()

      const expectedAbs = `${baseURL ?? 'http://localhost:4173'}${c.expectedOgPath}`
      const ogImage = pickTag(body, /<meta property="og:image" content="([^"]+)">/)
      const twitterImage = pickTag(body, /<meta name="twitter:image" content="([^"]+)">/)

      // The build emits absolute URLs anchored at https://tickpedia.com,
      // not the preview's local origin. Strip the origin and compare
      // paths so the spec works in CI + local previews alike.
      expect(asPath(ogImage)).toBe(c.expectedOgPath)
      expect(asPath(twitterImage)).toBe(c.expectedOgPath)
      // Sanity: not the legacy fallback.
      expect(asPath(ogImage)).not.toBe('/og-default.png')

      // The named PNG actually exists on disk.
      const png = await request.get(c.expectedOgPath)
      expect(png.ok(), `${c.expectedOgPath} did not 200`).toBe(true)
      const ct = png.headers()['content-type'] ?? ''
      expect(ct, `${c.expectedOgPath} content-type`).toMatch(/image\/png/i)
      const bytes = await png.body()
      expect(bytes.length, `${c.expectedOgPath} bytes`).toBeGreaterThan(5_000)
      // PNG magic bytes.
      expect(bytes[0]).toBe(0x89)
      expect(bytes[1]).toBe(0x50)
      expect(bytes[2]).toBe(0x4e)
      expect(bytes[3]).toBe(0x47)
      // Pull through `expectedAbs` so the helper is not flagged unused
      // when the spec runs against a non-default base URL.
      expect(expectedAbs).toMatch(/\/og\/.+\.png$/)
    })
  }
})

test.describe('seo · default OG fallback', () => {
  test('/og-default.png exists as a real PNG (replaces the legacy placeholder)', async ({ request }) => {
    const res = await request.get('/og-default.png')
    expect(res.ok(), '/og-default.png did not 200').toBe(true)
    const ct = res.headers()['content-type'] ?? ''
    expect(ct).toMatch(/image\/png/i)
    const bytes = await res.body()
    expect(bytes.length).toBeGreaterThan(5_000)
  })
})

function pickTag(body: string, pattern: RegExp): string | null {
  const m = body.match(pattern)
  return m?.[1] ?? null
}

function asPath(absoluteOrPath: string | null): string | null {
  if (!absoluteOrPath) return absoluteOrPath
  if (absoluteOrPath.startsWith('http://') || absoluteOrPath.startsWith('https://')) {
    try {
      return new URL(absoluteOrPath).pathname
    } catch {
      return absoluteOrPath
    }
  }
  return absoluteOrPath
}
