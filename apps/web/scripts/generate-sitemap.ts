// Build-time: query SemiLayer for every canonical URL and write
// `dist/sitemap.xml`. Runs after `vite build` (see package.json).
//
// Site origin defaults to `https://tickpedia.com` and is overridable
// via `SITE_ORIGIN` for staging-style deploys.
//
// When `NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY` is missing we still emit a
// sitemap — only with the *static* URLs (everything in URL_PATTERNS
// whose `slugSource` is null). That keeps Playwright builds working
// without secrets, and means a key-less local `pnpm build` still
// ships a valid (if partial) sitemap. When the key IS set, a
// SemiLayer failure exits non-zero — silent partial data on deploy
// would be worse than a loud failed deploy.

import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { BeamClient } from '@semilayer/client'
import {
  listCanonicalUrls,
  type CanonicalUrl,
} from '../src/routes/canonical-urls.js'
import { URL_PATTERNS, type EntityKind } from '../src/routes/contract.js'
import { renderSitemap } from '../src/routes/sitemap.js'

const DEFAULT_ORIGIN = 'https://tickpedia.com'

// Kinds we deliberately keep out of the sitemap. `search` is disallowed
// in robots.txt and serves dynamic results; `not-found` is a noindex
// surface. Either appearing in the sitemap would invite Google to index
// them as if they were destination pages.
const NOINDEX_KINDS = new Set<EntityKind>(['search', 'not-found'])

async function main(): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY
  const baseUrl = process.env.SEMILAYER_SERVICE_URL ?? 'https://api.semilayer.com'
  const origin = process.env.SITE_ORIGIN ?? DEFAULT_ORIGIN

  let urls: CanonicalUrl[]
  let mode: 'full' | 'static-only'

  if (!apiKey) {
    console.warn(
      '⚠ NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY unset — emitting STATIC-ONLY sitemap. ' +
        'Parametric URLs (/ticks/[slug], /diseases/[slug], …) will be missing.',
    )
    urls = staticOnlyUrls()
    mode = 'static-only'
  } else {
    const client = new BeamClient({ baseUrl, apiKey })
    urls = await listCanonicalUrls(client)
    mode = 'full'
  }

  const indexable = urls.filter((u) => !NOINDEX_KINDS.has(u.kind))

  const startedAt = Date.now()
  const xml = renderSitemap(indexable, { origin })
  const outPath = resolve(import.meta.dirname, '..', 'dist', 'sitemap.xml')
  await writeFile(outPath, xml, 'utf8')

  const tookMs = Date.now() - startedAt
  console.log(
    `✓ wrote ${indexable.length} URLs to dist/sitemap.xml in ${tookMs}ms ` +
      `(origin ${origin}, ${mode}; ${urls.length - indexable.length} noindex kind(s) excluded)`,
  )
}

function staticOnlyUrls(): CanonicalUrl[] {
  return URL_PATTERNS.filter((p) => p.slugSource === null).map((p) => ({
    kind: p.kind,
    path: p.path,
    template: p.path,
  }))
}

main().catch((err) => {
  console.error('✗ sitemap generation failed:', err)
  process.exit(1)
})
