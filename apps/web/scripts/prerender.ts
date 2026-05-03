// Build-time: per-canonical-URL static HTML emitter.
//
// Pipeline (driven by `pnpm build`):
//   1. `vite build`                       → dist/         (client bundle)
//   2. `vite build --ssr entry-server`    → dist-ssr/     (server bundle)
//   3. `tsx scripts/prerender.ts`         → dist/<path>/index.html per URL
//
// Reads the built `dist/index.html` as a template, swaps in per-page
// title / meta / canonical / JSON-LD, replaces `<div id="root"></div>`
// with the React-rendered body, and inlines the SSR data cache as
// `window.__TICKPEDIA_DATA__` so client hydration matches.
//
// Currently covers the tick page family. Other URL kinds keep using
// the SPA fallback (`dist/index.html` → `dist/404.html`) until their
// per-kind prefetch lands.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { BeamClient } from '@semilayer/client'
import { listCanonicalUrls } from '../src/routes/canonical-urls.js'
import { prefetchTickPage } from '../src/ssr/prefetch/tick.js'
import { prefetchDiseasePage } from '../src/ssr/prefetch/disease.js'
import {
  prefetchTechniquePage,
  prefetchTechniquesIndex,
} from '../src/ssr/prefetch/technique.js'
import { buildTickRangeHead } from '../src/pages/tick/seo.js'
import { buildDiseaseSubPageHead } from '../src/pages/disease/seo.js'
import { buildHeadHtml } from '../src/pages/shared/seo/index.js'
import {
  serializeDataCache,
  type DataCache,
} from '../src/ssr/index.js'
import type { PageHead } from '../src/pages/shared/seo/types.js'

interface SsrModule {
  render: (path: string, data: DataCache) => { bodyHtml: string }
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = resolve(SCRIPT_DIR, '..')
const DIST_DIR = resolve(WEB_ROOT, 'dist')
const SSR_BUNDLE = resolve(WEB_ROOT, 'dist-ssr', 'entry-server.js')
const TEMPLATE_PATH = resolve(DIST_DIR, 'index.html')

async function main(): Promise<void> {
  // Pull keys out of `.env` at the repo root before reading
  // process.env. tsx scripts don't get Vite's dotenv handling for
  // free, and we want `pnpm build` (and the e2e harness, which calls
  // it) to "just work" whenever .env is present locally — without
  // adding a runtime dependency.
  loadDotenv(resolve(WEB_ROOT, '..', '..', '.env'))
  const apiKey = process.env.NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY
  if (!apiKey) {
    console.warn(
      '⚠ NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY unset — skipping prerender. ' +
        'Per-tick HTML will not be emitted; the SPA fallback will serve all URLs.',
    )
    return
  }

  const baseUrl = process.env.SEMILAYER_SERVICE_URL ?? 'https://api.semilayer.com'
  const client = new BeamClient({ apiKey, baseUrl })

  const template = await readFile(TEMPLATE_PATH, 'utf8')
  const ssr = (await import(pathToFileURL(SSR_BUNDLE).href)) as SsrModule

  const allUrls = await listCanonicalUrls(client)

  const startedAt = Date.now()
  let written = 0
  let skipped = 0

  // ── Tick page family ──
  const tickSlugs = new Set<string>()
  for (const url of allUrls) {
    if ((url.kind === 'tick' || url.kind === 'tick-range') && url.slug) {
      tickSlugs.add(url.slug)
    }
  }

  for (const slug of tickSlugs) {
    const prefetched = await prefetchTickPage(client, slug)
    if (!prefetched) {
      skipped += 1
      continue
    }

    written += await emit(template, ssr, `/ticks/${slug}`, prefetched.cache, prefetched.head)

    const tickRow = prefetched.cache[`tick:${slug}`] as
      | { commonName: string; scientificName: string; slug: string }
      | undefined
    if (tickRow) {
      const rangeHead = buildTickRangeHead(tickRow)
      written += await emit(template, ssr, `/ticks/${slug}/range`, prefetched.cache, rangeHead)
    }
  }

  // ── Disease page family ──
  const diseaseSlugs = new Set<string>()
  for (const url of allUrls) {
    if (
      (url.kind === 'disease' ||
        url.kind === 'disease-states' ||
        url.kind === 'disease-seasonality' ||
        url.kind === 'disease-history' ||
        url.kind === 'disease-ticks' ||
        url.kind === 'disease-pathogens') &&
      url.slug
    ) {
      diseaseSlugs.add(url.slug)
    }
  }

  for (const slug of diseaseSlugs) {
    const prefetched = await prefetchDiseasePage(client, slug)
    if (!prefetched) {
      skipped += 1
      continue
    }
    const { cache, head, disease } = prefetched

    written += await emit(template, ssr, `/diseases/${slug}`, cache, head)
    written += await emit(template, ssr, `/diseases/${slug}/states`,       cache, buildDiseaseSubPageHead(disease, 'States'))
    written += await emit(template, ssr, `/diseases/${slug}/seasonality`,  cache, buildDiseaseSubPageHead(disease, 'Seasonality'))
    written += await emit(template, ssr, `/diseases/${slug}/history`,      cache, buildDiseaseSubPageHead(disease, 'History'))
    written += await emit(template, ssr, `/diseases/${slug}/ticks`,        cache, buildDiseaseSubPageHead(disease, 'Ticks'))
    written += await emit(template, ssr, `/diseases/${slug}/pathogens`,    cache, buildDiseaseSubPageHead(disease, 'Pathogens'))
  }

  // ── Technique page family ──
  const techniqueIndex = await prefetchTechniquesIndex(client)
  written += await emit(template, ssr, '/techniques', techniqueIndex.cache, techniqueIndex.head)

  const techniqueSlugs = new Set<string>()
  for (const url of allUrls) {
    if (url.kind === 'technique' && url.slug) techniqueSlugs.add(url.slug)
  }

  for (const slug of techniqueSlugs) {
    const prefetched = await prefetchTechniquePage(client, slug)
    if (!prefetched) {
      skipped += 1
      continue
    }
    written += await emit(template, ssr, `/techniques/${slug}`, prefetched.cache, prefetched.head)
  }

  const tookMs = Date.now() - startedAt
  console.log(
    `✓ prerendered ${written} HTML file${written === 1 ? '' : 's'} ` +
      `(${tickSlugs.size} ticks, ${diseaseSlugs.size} diseases, ${techniqueSlugs.size} techniques, ${skipped} skipped) in ${tookMs}ms`,
  )
}

async function emit(
  template: string,
  ssr: SsrModule,
  path: string,
  cache: DataCache,
  head: PageHead,
): Promise<number> {
  const { bodyHtml } = ssr.render(path, cache)
  const headHtml = buildHeadHtml(head)
  const dataScript = `<script>window.__TICKPEDIA_DATA__=${serializeDataCache(cache)}</script>`
  const html = injectIntoTemplate(template, { headHtml, bodyHtml, dataScript })

  const outPath = pathToOutputFile(DIST_DIR, path)
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, html, 'utf8')
  return 1
}

interface InjectOptions {
  headHtml: string
  bodyHtml: string
  dataScript: string
}

export function injectIntoTemplate(template: string, opts: InjectOptions): string {
  // Strip the placeholder title + meta description from the static
  // shell — the per-page versions go in via headHtml.
  let out = template
    .replace(/<title>[^<]*<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>\s*/i, '')

  // Inject the per-page head right before </head>.
  out = out.replace(/<\/head>/i, `    ${opts.headHtml}\n  </head>`)

  // Swap the empty root div for the rendered body + data script.
  out = out.replace(
    /<div id="root">\s*<\/div>/i,
    `<div id="root">${opts.bodyHtml}</div>\n    ${opts.dataScript}`,
  )

  return out
}

export function pathToOutputFile(distDir: string, path: string): string {
  // /ticks/lone-star-tick         → dist/ticks/lone-star-tick.html
  // /ticks/lone-star-tick/range   → dist/ticks/lone-star-tick/range.html
  // /                             → dist/index.html (template; we don't overwrite)
  //
  // Using `.html` (not `<path>/index.html`) matches the existing
  // alias-stub layout, so Vite preview, `vite dev`, and GitHub Pages
  // all serve the right file for a bare path without a trailing slash.
  if (path === '/') return resolve(distDir, 'index.html')
  const trimmed = path.replace(/^\/+/, '').replace(/\/+$/, '')
  return join(distDir, trimmed + '.html')
}

/**
 * Tiny .env loader. Sets variables not already in process.env so a
 * shell-exported value still wins. Quoted values are de-quoted; lines
 * starting with `#` and blank lines are ignored.
 */
export function loadDotenv(path: string): void {
  if (!existsSync(path)) return
  const text = readFileSync(path, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

main().catch((err) => {
  console.error('✗ prerender failed:', err)
  process.exit(1)
})
