import { describe, it, expect } from 'vitest'
import { renderSitemap } from '../sitemap.js'
import type { CanonicalUrl } from '../canonical-urls.js'

const SAMPLE: CanonicalUrl[] = [
  { kind: 'home', path: '/', template: '/' },
  { kind: 'tick', path: '/ticks/blacklegged-tick', template: '/ticks/:slug', slug: 'blacklegged-tick' },
  {
    kind: 'county',
    path: '/counties/maine/cumberland',
    template: '/counties/:state/:slug',
    slug: 'cumberland',
    parentSlug: 'maine',
  },
]

describe('renderSitemap', () => {
  it('emits the XML declaration + urlset wrapper', () => {
    const xml = renderSitemap(SAMPLE, { origin: 'https://tickpedia.com' })
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('</urlset>')
  })

  it('emits one <url><loc> per canonical URL with the origin prepended', () => {
    const xml = renderSitemap(SAMPLE, { origin: 'https://tickpedia.com' })
    expect(xml).toContain('<loc>https://tickpedia.com/</loc>')
    expect(xml).toContain('<loc>https://tickpedia.com/ticks/blacklegged-tick</loc>')
    expect(xml).toContain('<loc>https://tickpedia.com/counties/maine/cumberland</loc>')
  })

  it('omits <lastmod> when no per-URL date is supplied', () => {
    const xml = renderSitemap(SAMPLE, { origin: 'https://tickpedia.com' })
    expect(xml).not.toContain('<lastmod>')
  })

  it('emits <lastmod> when the lastmodFor callback returns a value', () => {
    const xml = renderSitemap(SAMPLE, {
      origin: 'https://tickpedia.com',
      lastmodFor: (u) => (u.kind === 'tick' ? '2026-04-01' : undefined),
    })
    expect(xml).toContain('<loc>https://tickpedia.com/ticks/blacklegged-tick</loc>')
    expect(xml).toContain('<lastmod>2026-04-01</lastmod>')
    // home + county still have no lastmod
    expect(xml.match(/<lastmod>/g)?.length).toBe(1)
  })

  it('strips a trailing slash off the origin', () => {
    const xml = renderSitemap(SAMPLE, { origin: 'https://tickpedia.com/' })
    expect(xml).toContain('<loc>https://tickpedia.com/</loc>')
    expect(xml).not.toContain('https://tickpedia.com//')
  })

  it('rejects a relative origin — the spec demands absolute URLs', () => {
    expect(() => renderSitemap(SAMPLE, { origin: '/foo' })).toThrow(/origin must be an absolute URL/)
  })

  it('escapes XML special characters in the loc', () => {
    const url: CanonicalUrl[] = [
      { kind: 'fact', path: '/facts/some&fact', template: '/facts/:slug', slug: 'some&fact' },
    ]
    const xml = renderSitemap(url, { origin: 'https://tickpedia.com' })
    expect(xml).toContain('<loc>https://tickpedia.com/facts/some&amp;fact</loc>')
    expect(xml).not.toContain('some&fact</loc>')
  })

  it('returns a deterministic order — same input, same output', () => {
    const a = renderSitemap(SAMPLE, { origin: 'https://tickpedia.com' })
    const b = renderSitemap(SAMPLE, { origin: 'https://tickpedia.com' })
    expect(a).toBe(b)
  })
})
