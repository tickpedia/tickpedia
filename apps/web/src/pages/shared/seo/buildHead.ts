// Build the per-page `<head>` HTML for SSR injection. Pure string
// assembly — the prerender script slots the result into the static
// shell after `vite build`. Runtime page navigation does not call
// this; the lighter `useDocumentHead` hook handles that path.

import type { PageHead } from './types.js'

export interface BuildHeadOptions {
  /** Origin to prefix canonical and OG URLs. Defaults to live origin. */
  origin?: string
  /** Path of the default OG image when a page does not set its own. */
  defaultOgImagePath?: string
}

export const DEFAULT_ORIGIN = 'https://tickpedia.com'
export const DEFAULT_OG_IMAGE_PATH = '/og-default.png'

export function buildHeadHtml(head: PageHead, options: BuildHeadOptions = {}): string {
  const origin = options.origin ?? DEFAULT_ORIGIN
  const defaultOgPath = options.defaultOgImagePath ?? DEFAULT_OG_IMAGE_PATH
  const url = `${origin}${head.canonicalPath}`
  const ogImage = `${origin}${head.ogImagePath ?? defaultOgPath}`

  const lines: string[] = [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${escapeAttr(head.description)}">`,
    `<link rel="canonical" href="${escapeAttr(url)}">`,
    `<meta property="og:title" content="${escapeAttr(head.title)}">`,
    `<meta property="og:description" content="${escapeAttr(head.description)}">`,
    `<meta property="og:url" content="${escapeAttr(url)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="Tickpedia">`,
    `<meta property="og:image" content="${escapeAttr(ogImage)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeAttr(head.title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(head.description)}">`,
    `<meta name="twitter:image" content="${escapeAttr(ogImage)}">`,
  ]

  if (head.jsonLd) {
    const schemas = Array.isArray(head.jsonLd) ? head.jsonLd : [head.jsonLd]
    for (const schema of schemas) {
      lines.push(renderJsonLd(schema))
    }
  }

  return lines.join('\n    ')
}

function renderJsonLd(schema: object): string {
  // JSON in <script type="application/ld+json"> is read as text, so we
  // only need to escape `</` to prevent tag-breakout. U+2028 / U+2029
  // are valid inside this script type, so no extra escaping required.
  const json = JSON.stringify(schema).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${json}</script>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
