// Pure XML serialiser for sitemap.xml. Takes a list of CanonicalUrls
// and a site origin, returns the document body. Kept pure so the unit
// tests don't need to touch SemiLayer or the filesystem.
//
// Conforms to the sitemap protocol (sitemaps.org). Optional fields
// (lastmod, changefreq, priority) are omitted by default — Google
// treats them as advisory and we don't have authoritative values yet.
// When the build script learns to read each entity's updatedAt, we'll
// thread it through the `lastmod` field.

import type { CanonicalUrl } from './canonical-urls.js'

export interface SitemapOptions {
  /** Site origin without trailing slash, e.g. `https://tickpedia.com`. */
  origin: string
  /**
   * Per-URL ISO 8601 date for `<lastmod>`. Optional — pages without an
   * entry get no lastmod element (Google then falls back to crawl-time
   * detection).
   */
  lastmodFor?: (url: CanonicalUrl) => string | undefined
}

export function renderSitemap(
  urls: readonly CanonicalUrl[],
  options: SitemapOptions,
): string {
  const origin = options.origin.replace(/\/+$/, '')
  if (!origin.startsWith('http')) {
    throw new Error(`sitemap origin must be an absolute URL, got "${options.origin}"`)
  }

  const entries = urls
    .map((u) => renderUrlEntry(u, origin, options.lastmodFor))
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n')
}

function renderUrlEntry(
  url: CanonicalUrl,
  origin: string,
  lastmodFor: SitemapOptions['lastmodFor'],
): string {
  const loc = `${origin}${url.path}`
  const lastmod = lastmodFor?.(url)
  const lines = ['  <url>', `    <loc>${escapeXml(loc)}</loc>`]
  if (lastmod) lines.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`)
  lines.push('  </url>')
  return lines.join('\n')
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
