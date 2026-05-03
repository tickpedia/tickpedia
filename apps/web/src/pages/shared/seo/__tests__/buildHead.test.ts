import { describe, it, expect } from 'vitest'
import { buildHeadHtml, DEFAULT_ORIGIN, DEFAULT_OG_IMAGE_PATH } from '../buildHead.js'
import { tickAnimalSchema, breadcrumbListSchema } from '../jsonLd.js'

describe('buildHeadHtml', () => {
  it('emits title, meta description, and canonical link with the live origin', () => {
    const html = buildHeadHtml({
      title: 'Lone star tick — Ticks | Tickpedia',
      description: 'Aggressive biter; the alpha-gal vector.',
      canonicalPath: '/ticks/lone-star-tick',
    })
    expect(html).toContain('<title>Lone star tick — Ticks | Tickpedia</title>')
    expect(html).toContain('<meta name="description" content="Aggressive biter; the alpha-gal vector.">')
    expect(html).toContain('<link rel="canonical" href="https://tickpedia.com/ticks/lone-star-tick">')
  })

  it('builds OG + Twitter tags pointing at the canonical URL', () => {
    const html = buildHeadHtml({
      title: 'Test',
      description: 'Test description',
      canonicalPath: '/ticks/x',
    })
    expect(html).toContain(`<meta property="og:url" content="${DEFAULT_ORIGIN}/ticks/x">`)
    expect(html).toContain(`<meta property="og:image" content="${DEFAULT_ORIGIN}${DEFAULT_OG_IMAGE_PATH}">`)
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">')
  })

  it('honours a custom origin', () => {
    const html = buildHeadHtml(
      { title: 't', description: 'd', canonicalPath: '/foo' },
      { origin: 'https://staging.tickpedia.com' },
    )
    expect(html).toContain('<link rel="canonical" href="https://staging.tickpedia.com/foo">')
  })

  it('escapes HTML-special chars in title and description', () => {
    const html = buildHeadHtml({
      title: 'Foo & <bar>',
      description: '"quoted" & <html>',
      canonicalPath: '/x',
    })
    expect(html).toContain('<title>Foo &amp; &lt;bar&gt;</title>')
    expect(html).toContain('content="&quot;quoted&quot; &amp; &lt;html&gt;"')
  })

  it('embeds JSON-LD payload(s) as application/ld+json scripts', () => {
    const animal = tickAnimalSchema(
      { slug: 't', commonName: 'T', scientificName: 'Tt', oneLiner: null },
      DEFAULT_ORIGIN,
    )
    const crumbs = breadcrumbListSchema(
      [{ label: 'Tickpedia', path: '/' }, { label: 'Ticks', path: '/ticks' }, { label: 'T' }],
      DEFAULT_ORIGIN,
    )
    const html = buildHeadHtml({
      title: 't',
      description: 'd',
      canonicalPath: '/ticks/t',
      jsonLd: [animal, crumbs],
    })
    const scripts = html.match(/<script type="application\/ld\+json">/g)
    expect(scripts).toHaveLength(2)
    expect(html).toContain('"@type":"Animal"')
    expect(html).toContain('"@type":"BreadcrumbList"')
  })

  it('escapes </ inside JSON-LD payload to prevent tag breakout', () => {
    const html = buildHeadHtml({
      title: 't',
      description: 'd',
      canonicalPath: '/x',
      jsonLd: { evil: '</script><script>alert(1)</script>' },
    })
    expect(html).not.toContain('</script><script>alert(1)')
    expect(html).toContain('\\u003c/script')
  })
})
