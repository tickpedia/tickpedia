import { test, expect } from '@playwright/test'

// Per-page SEO is shipped via build-time SSR prerender (Section B5
// of plan/steps/05_design_handoff_and_urls.md), so these specs fetch
// the raw HTML response — no `page.goto`, no JS execution. That's
// exactly what `view-source:` and social-card scrapers see.
//
// New page kinds get their canonical added here once their per-kind
// prefetch lands.

interface SeoCase {
  path: string
  expectedTitle: string
  expectedCanonical: string
  /** Substring expected in the meta description. */
  descriptionContains?: string
}

const SEO_CASES: ReadonlyArray<SeoCase> = [
  {
    path: '/ticks/blacklegged-tick',
    expectedTitle: 'Blacklegged tick — Ticks | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/ticks/blacklegged-tick',
  },
  {
    path: '/ticks/lone-star-tick',
    expectedTitle: 'Lone star tick — Ticks | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/ticks/lone-star-tick',
  },
  {
    path: '/ticks/blacklegged-tick/range',
    expectedTitle: 'Blacklegged tick range — Ticks | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/ticks/blacklegged-tick/range',
  },
  {
    path: '/diseases/lyme-disease',
    expectedTitle: 'Lyme disease — Diseases | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/diseases/lyme-disease',
  },
  {
    path: '/diseases/lyme-disease/states',
    expectedTitle: 'Lyme disease — States | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/diseases/lyme-disease/states',
  },
  {
    path: '/diseases/lyme-disease/seasonality',
    expectedTitle: 'Lyme disease — Seasonality | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/diseases/lyme-disease/seasonality',
  },
  {
    path: '/techniques',
    expectedTitle: 'Techniques — Tickpedia',
    expectedCanonical: 'https://tickpedia.com/techniques',
  },
  {
    path: '/techniques/fine-tipped-tweezers',
    expectedTitle: 'Fine-tipped tweezers (CDC method) — Techniques | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/techniques/fine-tipped-tweezers',
  },
  {
    path: '/states',
    expectedTitle: 'States — Tickpedia',
    expectedCanonical: 'https://tickpedia.com/states',
  },
  {
    path: '/states/maine',
    expectedTitle: 'Maine — States | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/states/maine',
  },
  {
    path: '/states/maine/ticks',
    expectedTitle: 'Maine — Ticks | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/states/maine/ticks',
  },
  {
    path: '/states/maine/diseases',
    expectedTitle: 'Maine — Diseases | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/states/maine/diseases',
  },
  {
    path: '/states/maine/counties',
    expectedTitle: 'Maine — Counties | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/states/maine/counties',
  },
  {
    path: '/counties',
    expectedTitle: 'Counties — top-100 by tick-borne disease load | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/counties',
  },
  {
    path: '/counties/maine/cumberland',
    expectedTitle: 'Cumberland County — Maine | Tickpedia',
    expectedCanonical: 'https://tickpedia.com/counties/maine/cumberland',
  },
  {
    path: '/facts',
    expectedTitle: 'Wild facts — Tickpedia',
    expectedCanonical: 'https://tickpedia.com/facts',
  },
]

test.describe('seo · per-page surface in raw HTML (no JS)', () => {
  for (const c of SEO_CASES) {
    test(`${c.path}`, async ({ request }) => {
      const res = await request.get(c.path)
      expect(res.ok(), `${c.path} did not 200`).toBe(true)
      const body = await res.text()

      // Title.
      const title = pickTag(body, /<title>([^<]+)<\/title>/)
      expect(title, `${c.path} title`).toBe(c.expectedTitle)

      // Exactly one canonical link with the right href.
      const canonicals = [...body.matchAll(/<link rel="canonical" href="([^"]+)">/g)]
      expect(canonicals.length, `${c.path} canonical count`).toBe(1)
      expect(canonicals[0]?.[1]).toBe(c.expectedCanonical)

      // OG and Twitter mirror the canonical URL + title.
      expect(body).toContain(`<meta property="og:url" content="${c.expectedCanonical}">`)
      expect(body).toContain(`<meta property="og:title" content="${c.expectedTitle}">`)
      expect(body).toContain('<meta property="og:type" content="article">')
      expect(body).toContain('<meta name="twitter:card" content="summary_large_image">')
      expect(body).toContain(`<meta name="twitter:title" content="${c.expectedTitle}">`)

      // Meta description present (specific text varies per tick — assert
      // the tag is present and non-empty; per-tick tests cover content).
      const description = pickTag(body, /<meta name="description" content="([^"]+)">/)
      expect(description).toBeTruthy()
      expect(description?.length).toBeGreaterThan(20)

      if (c.descriptionContains) {
        expect(description).toContain(c.descriptionContains)
      }
    })
  }
})

test.describe('seo · prerendered body in raw HTML', () => {
  test('/ticks/lone-star-tick body contains the H1 and disease links without JS', async ({ request }) => {
    const res = await request.get('/ticks/lone-star-tick')
    const body = await res.text()
    // The H1 lands in raw HTML — the SSR prerender replaces #root with
    // the rendered React tree, so view-source matches what crawlers
    // index.
    expect(body).toMatch(/<h1[^>]*>Lone star tick<\/h1>/i)
    // Internal links to disease pages — every disease the tick carries
    // ships as a link in the static HTML.
    expect(body).toMatch(/href="\/diseases\/alpha-gal-syndrome"/)
  })

  test('/ticks/lone-star-tick inlines the SSR data cache for hydration', async ({ request }) => {
    const res = await request.get('/ticks/lone-star-tick')
    const body = await res.text()
    expect(body).toContain('window.__TICKPEDIA_DATA__=')
    expect(body).toContain('"tick:lone-star-tick"')
  })

  test('/diseases/lyme-disease body contains the H1 and tick cross-links without JS', async ({ request }) => {
    const res = await request.get('/diseases/lyme-disease')
    const body = await res.text()
    expect(body).toMatch(/<h1[^>]*>Lyme disease<\/h1>/i)
    // Cross-link out to at least one tick page (the brief promises
    // every carrying tick is rendered as a link).
    expect(body).toMatch(/href="\/ticks\/blacklegged-tick"/)
    // Flagship CTA points at /risk/[slug].
    expect(body).toMatch(/href="\/risk\/lyme-disease"/)
  })

  test('/diseases/lyme-disease inlines the SSR data cache under disease:<slug>', async ({ request }) => {
    const res = await request.get('/diseases/lyme-disease')
    const body = await res.text()
    expect(body).toContain('window.__TICKPEDIA_DATA__=')
    expect(body).toContain('"disease:lyme-disease"')
  })
})

function pickTag(body: string, pattern: RegExp): string | null {
  const m = body.match(pattern)
  return m?.[1] ?? null
}
