// Build-time per-page OG image generator.
//
// Reads canonical URLs from `listCanonicalUrls()`, picks a template
// per kind, hits SemiLayer for the data each template needs, then
// rasterises through satori → resvg and writes a PNG into
// `dist/og/<path>.png`.
//
// Pipeline order (apps/web/package.json):
//   1. vite build
//   2. vite build --ssr
//   3. tsx scripts/prerender.ts        ← writes per-page HTML
//   4. tsx scripts/og/generate-og.ts   ← writes per-page PNG (this file)
//   5. tsx scripts/emit-alias-stubs.ts
//   6. tsx scripts/copy-spa-fallback.ts
//   7. tsx scripts/generate-sitemap.ts
//
// Coverage strategy:
//   - Default: every URL in the contract that has data (~150–200 URLs).
//     Counties are sampled to the top-200 by total disease cases.
//   - OG_FULL=1 emits every county too (~3,000 PNGs, ~2.5min on a laptop).
//   - Per-kind defaults (`/og/default-<kind>.png`) emitted unconditionally.
//   - The site-wide `/og-default.png` is regenerated from the default
//     template so the legacy placeholder gets replaced.

import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReactElement } from 'react'
import { BeamClient } from '@semilayer/client'
import { listCanonicalUrls, type CanonicalUrl } from '../../src/routes/canonical-urls.js'
import { ogPathFor } from '../../src/pages/shared/seo/og-paths.js'
import { citationHostname } from '../../src/pages/fact/data/slug-title.js'
import { parseSteps } from '../../src/pages/technique/data/steps.js'
import { formatCountyName } from '../../src/pages/county/data/county-name.js'
import { renderPng } from './render-png.js'
import { loadOgFonts, type OgFont } from './load-fonts.js'
import { DefaultTemplate } from './templates/default.js'
import { HomeTemplate } from './templates/home.js'
import { TickTemplate, TickRangeTemplate } from './templates/tick.js'
import { DiseaseTemplate } from './templates/disease.js'
import { StateTemplate } from './templates/state.js'
import { CountyTemplate } from './templates/county.js'
import { TechniqueTemplate } from './templates/technique.js'
import { FactTemplate } from './templates/fact.js'
import { RiskTemplate } from './templates/risk.js'
import { ListingTemplate } from './templates/listing.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = resolve(SCRIPT_DIR, '..', '..')
const DIST_DIR = resolve(WEB_ROOT, 'dist')
const OG_DIR = resolve(DIST_DIR, 'og')

const COUNTY_SAMPLE = 200
const RENDER_CONCURRENCY = 8

interface QueryResponse<T> {
  rows: T[]
}
interface AnalyzeBucket<D, M> {
  dims: D
  measures: M
}
interface AnalyzeResult<D, M> {
  buckets: Array<AnalyzeBucket<D, M>>
}

interface TickRowMin {
  id: number
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
  dangerLevel: 'low' | 'medium' | 'high' | null
  heroHeadColor: string | null
  heroBodyColor: string | null
  heroLegColor: string | null
}
interface DiseaseRowMin {
  id: number
  slug: string
  displayName: string
  oneLiner: string | null
  aliases: string[] | null
}
interface TechniqueRowMin {
  id: number
  slug: string
  title: string
  oneLiner: string | null
  steps: string | null
}
interface StateRowMin {
  fips: string
  code: string
  slug: string
  name: string
}
interface CountyRowMin {
  fips: string
  slug: string
  stateFips: string
  countyName: string
}
interface FactRowMin {
  id: number
  slug: string
  body: string
  citationUrl: string | null
}

async function main(): Promise<void> {
  loadDotenv(resolve(WEB_ROOT, '..', '..', '.env'))
  const apiKey = process.env.NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY
  if (!apiKey) {
    console.warn(
      '⚠ NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY unset — skipping OG image generation. ' +
        'The HTML head will still claim /og/<path>.png, but the files will not exist.',
    )
    return
  }

  if (!existsSync(DIST_DIR)) {
    throw new Error(
      `dist/ does not exist (${DIST_DIR}). Run \`pnpm build\` (vite build) first.`,
    )
  }

  const fullMode = process.env.OG_FULL === '1'

  const baseUrl = process.env.SEMILAYER_SERVICE_URL ?? 'https://api.semilayer.com'
  const client = new BeamClient({ apiKey, baseUrl })

  const fonts = await loadOgFonts()

  const startedAt = Date.now()
  await mkdir(OG_DIR, { recursive: true })

  // 1. Pull entity data once, in parallel.
  const [
    ticks,
    diseases,
    techniques,
    states,
    counties,
    facts,
    homeStats,
  ] = await Promise.all([
    fetchTicks(client),
    fetchDiseases(client),
    fetchTechniques(client),
    fetchStates(client),
    fetchCounties(client),
    fetchFacts(client),
    fetchHomeStats(client),
  ])

  // 2. Pre-compute roll-ups the templates need (disease totals, top
  //    counties by case load, tick disease counts).
  const [
    diseaseTotals,
    diseasePeakMonths,
    tickDiseaseCounts,
    tickRangeStats,
    countyTopCases,
    stateTopStats,
  ] = await Promise.all([
    fetchDiseaseTotals(client, diseases),
    fetchDiseasePeakMonths(client, diseases),
    fetchTickDiseaseCounts(client, ticks),
    fetchTickRangeStats(client, ticks),
    fetchCountyTopCases(client),
    fetchStateTopStats(client, states),
  ])

  const ticksBySlug = new Map(ticks.map((t) => [t.slug, t]))
  const diseasesBySlug = new Map(diseases.map((d) => [d.slug, d]))
  const techniquesBySlug = new Map(techniques.map((t) => [t.slug, t]))
  const statesBySlug = new Map(states.map((s) => [s.slug, s]))
  const stateFipsToSlug = new Map(states.map((s) => [s.fips, s.slug]))
  const stateFipsToRow = new Map(states.map((s) => [s.fips, s]))
  const countiesByKey = new Map(
    counties.map((c) => [
      `${stateFipsToSlug.get(c.stateFips) ?? 'unknown-state'}/${c.slug}`,
      c,
    ]),
  )
  const factsBySlug = new Map(facts.map((f) => [f.slug, f]))

  // 3. Walk canonical URLs + render each.
  const allUrls = await listCanonicalUrls(client)

  const sampledCounties = sampleCounties(
    allUrls,
    countyTopCases,
    countiesByKey,
    fullMode ? null : COUNTY_SAMPLE,
  )
  const urlsToRender = allUrls.filter((u) => {
    if (u.kind !== 'county') return true
    const key = `${u.parentSlug}/${u.slug}`
    return sampledCounties.has(key)
  })

  // Always emit per-kind defaults + the site-wide default, regardless
  // of whether the corresponding canonical URLs are renderable.
  const tasks: Array<{ ogPath: string; render: () => Buffer | Promise<Buffer> }> = []

  // Site-wide default → /og-default.png at the dist root (the path
  // that DEFAULT_OG_IMAGE_PATH points at). This file replaces the
  // legacy hand-crafted placeholder so step 05's runtime SEO surface
  // continues to resolve to a real PNG when ogPathFor returns null.
  tasks.push({
    ogPath: '/og-default.png',
    render: () => renderPng(DefaultTemplate({}), { fonts }),
  })

  for (const url of urlsToRender) {
    const job = jobForUrl(url, {
      fonts,
      ticksBySlug,
      diseasesBySlug,
      techniquesBySlug,
      statesBySlug,
      stateFipsToRow,
      countiesByKey,
      factsBySlug,
      diseaseTotals,
      diseasePeakMonths,
      tickDiseaseCounts,
      tickRangeStats,
      stateTopStats,
      homeStats,
    })
    if (job) tasks.push(job)
  }

  let written = 0
  let failed = 0
  for (let i = 0; i < tasks.length; i += RENDER_CONCURRENCY) {
    const batch = tasks.slice(i, i + RENDER_CONCURRENCY)
    await Promise.all(
      batch.map(async (task) => {
        try {
          const buf = await task.render()
          const outPath = pathToOgFile(DIST_DIR, task.ogPath)
          await mkdir(dirname(outPath), { recursive: true })
          await writeFile(outPath, buf)
          written += 1
        } catch (err) {
          failed += 1
          console.error(`✗ failed ${task.ogPath}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }),
    )
  }

  const tookMs = Date.now() - startedAt
  console.log(
    `✓ wrote ${written} OG image${written === 1 ? '' : 's'} (${failed} failed) in ${tookMs}ms` +
      (fullMode ? ' [full]' : ` [sampled ${sampledCounties.size} counties]`),
  )
}

interface RenderContext {
  fonts: OgFont[]
  ticksBySlug: Map<string, TickRowMin>
  diseasesBySlug: Map<string, DiseaseRowMin>
  techniquesBySlug: Map<string, TechniqueRowMin>
  statesBySlug: Map<string, StateRowMin>
  stateFipsToRow: Map<string, StateRowMin>
  countiesByKey: Map<string, CountyRowMin>
  factsBySlug: Map<string, FactRowMin>
  diseaseTotals: Map<number, { totalCases: number; states: number }>
  diseasePeakMonths: Map<number, string | null>
  tickDiseaseCounts: Map<number, number>
  tickRangeStats: Map<number, { counties: number; states: number }>
  stateTopStats: Map<string, { tickCount: number; countyEstablished: number; diseaseCount: number }>
  homeStats: { tickCount: number; diseaseCount: number; stateCount: number }
}

function jobForUrl(
  url: CanonicalUrl,
  ctx: RenderContext,
): { ogPath: string; render: () => Promise<Buffer> } | null {
  const { fonts } = ctx
  const ogPath = ogPathFor(url.path)
  if (!ogPath) return null

  const make = (_canonicalPath: string, element: ReactElement) => ({
    ogPath,
    render: () => renderPng(element, { fonts }),
  })

  switch (url.kind) {
    case 'home':
      return make(url.path, HomeTemplate(ctx.homeStats))
    case 'season':
      return make(
        url.path,
        ListingTemplate({
          eyebrow: 'TICK SEASON',
          title: 'When is tick season?',
          description: 'A month-by-month read across the lower 48 — peaks, leading edges, and the species driving each.',
        }),
      )
    case 'risk':
      return make(url.path, RiskTemplate({ diseaseLabel: null }))
    case 'risk-disease': {
      const d = url.slug ? ctx.diseasesBySlug.get(url.slug) : null
      return make(url.path, RiskTemplate({ diseaseLabel: d?.displayName ?? url.slug ?? null }))
    }
    case 'sources':
      return make(url.path, ListingTemplate({
        eyebrow: 'SOURCES',
        title: 'Where the data comes from',
        description: 'Every URL Tickpedia cites — CDC, USGS, peer-reviewed papers, and public-domain references — grouped by domain.',
      }))
    case 'about':
      return make(url.path, ListingTemplate({
        eyebrow: 'ABOUT',
        title: 'About Tickpedia',
        description: 'Mission, data flow, license. An open-source field guide to ticks, the diseases they carry, and how to remove them.',
      }))
    case 'contribute':
      return make(url.path, ListingTemplate({
        eyebrow: 'CONTRIBUTE',
        title: 'Contribute to Tickpedia',
        description: 'How to file an issue, propose a fact, or send a pull request. We accept new ticks, diseases, removal techniques, and citations.',
      }))
    case 'search':
      return make(url.path, ListingTemplate({
        eyebrow: 'SEARCH',
        title: 'Search Tickpedia',
        description: 'Find a tick, a disease, a removal technique, or a wild fact — type a name or paste a scientific binomial.',
      }))
    case 'not-found':
      return make(url.path, ListingTemplate({
        eyebrow: '404',
        title: 'Not found',
        description: 'That URL is not part of the Tickpedia atlas. Try the search, or browse the index pages for ticks, diseases, and techniques.',
      }))

    case 'ticks-index':
      return make(url.path, ListingTemplate({
        eyebrow: 'FIELD GUIDE',
        title: 'Ticks',
        description: 'Every tick species in the U.S. record — common name, scientific name, range, and the diseases it carries.',
      }))
    case 'tick': {
      const t = url.slug ? ctx.ticksBySlug.get(url.slug) : null
      if (!t) return null
      return make(url.path, TickTemplate({
        commonName: t.commonName,
        scientificName: t.scientificName,
        oneLiner: t.oneLiner,
        family: null,
        diseaseCount: ctx.tickDiseaseCounts.get(t.id) ?? 0,
        danger: dangerOf(t.dangerLevel),
        colors: {
          headColor: t.heroHeadColor,
          bodyColor: t.heroBodyColor,
          legColor: t.heroLegColor,
        },
      }))
    }
    case 'tick-range': {
      const t = url.slug ? ctx.ticksBySlug.get(url.slug) : null
      if (!t) return null
      const stats = ctx.tickRangeStats.get(t.id) ?? { counties: 0, states: 0 }
      return make(url.path, TickRangeTemplate({
        commonName: t.commonName,
        scientificName: t.scientificName,
        countyCount: stats.counties,
        stateCount: stats.states,
        colors: {
          headColor: t.heroHeadColor,
          bodyColor: t.heroBodyColor,
          legColor: t.heroLegColor,
        },
      }))
    }
    case 'tick-diseases': {
      const t = url.slug ? ctx.ticksBySlug.get(url.slug) : null
      if (!t) return null
      return make(url.path, ListingTemplate({
        eyebrow: `${t.commonName.toUpperCase()} · DISEASES`,
        title: `${t.commonName} diseases`,
        description: t.oneLiner ?? `Diseases ${t.commonName} carries — pathogens, case counts, and prevention.`,
      }))
    }
    case 'tick-removal': {
      const t = url.slug ? ctx.ticksBySlug.get(url.slug) : null
      if (!t) return null
      return make(url.path, ListingTemplate({
        eyebrow: `${t.commonName.toUpperCase()} · REMOVAL`,
        title: `How to remove a ${t.commonName.toLowerCase()}`,
        description: 'Step-by-step removal: tools, technique, and what to do with the tick after.',
      }))
    }

    case 'diseases-index':
      return make(url.path, ListingTemplate({
        eyebrow: 'DISEASES',
        title: 'Tick-borne diseases',
        description: 'CDC-reported tick-borne illnesses — case counts, seasonality, and the ticks that carry each one.',
      }))
    case 'disease': {
      const d = url.slug ? ctx.diseasesBySlug.get(url.slug) : null
      if (!d) return null
      const totals = ctx.diseaseTotals.get(d.id) ?? { totalCases: 0, states: 0 }
      const peakMonth = ctx.diseasePeakMonths.get(d.id) ?? null
      const primaryAlias = d.aliases?.find((a) => a !== d.displayName) ?? null
      return make(url.path, DiseaseTemplate({
        displayName: d.displayName,
        oneLiner: d.oneLiner,
        primaryAlias,
        totalCases: totals.totalCases || null,
        peakMonth,
      }))
    }
    case 'disease-states':
    case 'disease-seasonality':
    case 'disease-ticks':
    case 'disease-pathogens':
    case 'disease-history': {
      const d = url.slug ? ctx.diseasesBySlug.get(url.slug) : null
      if (!d) return null
      return make(url.path, ListingTemplate({
        eyebrow: `${d.displayName.toUpperCase()} · ${diseaseSubLabel(url.kind)}`,
        title: `${d.displayName} — ${diseaseSubName(url.kind)}`,
        description: d.oneLiner ?? `${diseaseSubDescription(url.kind, d.displayName)}`,
      }))
    }

    case 'techniques-index':
      return make(url.path, ListingTemplate({
        eyebrow: 'TECHNIQUES',
        title: 'Removal & prevention',
        description: 'How to take a tick off, when to see a doctor, permethrin, tick tubes — the field-tested techniques and the sources behind them.',
      }))
    case 'technique': {
      const t = url.slug ? ctx.techniquesBySlug.get(url.slug) : null
      if (!t) return null
      const steps = parseSteps(t.steps).map((s) => s.text)
      return make(url.path, TechniqueTemplate({
        title: t.title,
        oneLiner: t.oneLiner,
        steps,
        category: null,
      }))
    }

    case 'states-index':
      return make(url.path, ListingTemplate({
        eyebrow: 'BY STATE',
        title: 'Tick risk by U.S. state',
        description: 'Tick distribution and disease cases for every state. Established species, CDC-reported totals, and county-level breakdowns.',
      }))
    case 'state': {
      const s = url.slug ? ctx.statesBySlug.get(url.slug) : null
      if (!s) return null
      const stats = ctx.stateTopStats.get(s.fips) ?? { tickCount: 0, countyEstablished: 0, diseaseCount: 0 }
      return make(url.path, StateTemplate({
        name: s.name,
        code: s.code,
        tickCount: stats.tickCount,
        countyEstablished: stats.countyEstablished,
        diseaseCount: stats.diseaseCount,
      }))
    }
    case 'state-ticks':
    case 'state-diseases':
    case 'state-counties': {
      const s = url.slug ? ctx.statesBySlug.get(url.slug) : null
      if (!s) return null
      return make(url.path, ListingTemplate({
        eyebrow: `${s.name.toUpperCase()} · ${stateSubLabel(url.kind)}`,
        title: `${s.name} — ${stateSubName(url.kind)}`,
        description: stateSubDescription(url.kind, s.name),
      }))
    }

    case 'counties-leaderboard':
      return make(url.path, ListingTemplate({
        eyebrow: 'LEADERBOARD',
        title: 'Top-100 county hotspots',
        description: 'The 100 U.S. counties with the highest cumulative tick-borne disease cases reported to CDC.',
      }))
    case 'county': {
      const key = `${url.parentSlug}/${url.slug}`
      const c = ctx.countiesByKey.get(key)
      const parent = c ? ctx.stateFipsToRow.get(c.stateFips) : null
      if (!c || !parent) return null
      return make(url.path, CountyTemplate({
        countyName: formatCountyName(c.countyName),
        parentStateName: parent.name,
        tickCount: 0,
        diseaseCases: 0,
        population: null,
      }))
    }

    case 'facts-index':
      return make(url.path, ListingTemplate({
        eyebrow: 'WILD FACTS',
        title: 'Wild facts',
        description: 'Short, sourced facts about ticks, the diseases they carry, and how to remove them.',
      }))
    case 'fact': {
      const f = url.slug ? ctx.factsBySlug.get(url.slug) : null
      if (!f) return null
      return make(url.path, FactTemplate({
        body: f.body,
        citationHost: citationHostname(f.citationUrl),
      }))
    }

    default: {
      const _exhaustive: never = url.kind
      void _exhaustive
      return null
    }
  }
}

// ── SemiLayer fetchers (lightweight, only fields the templates need) ──

async function fetchTicks(client: BeamClient): Promise<TickRowMin[]> {
  const res = (await client.query('ticks', {
    fields: [
      'id',
      'slug',
      'commonName',
      'scientificName',
      'oneLiner',
      'dangerLevel',
      'heroHeadColor',
      'heroBodyColor',
      'heroLegColor',
    ],
    limit: 200,
  })) as QueryResponse<TickRowMin>
  return res.rows.filter((r) => r.slug)
}

async function fetchDiseases(client: BeamClient): Promise<DiseaseRowMin[]> {
  const res = (await client.query('diseases', {
    fields: ['id', 'slug', 'displayName', 'oneLiner', 'aliases'],
    limit: 200,
  })) as QueryResponse<DiseaseRowMin>
  return res.rows.filter((r) => r.slug)
}

async function fetchTechniques(client: BeamClient): Promise<TechniqueRowMin[]> {
  const res = (await client.query('removalTechniques', {
    fields: ['id', 'slug', 'title', 'oneLiner', 'steps'],
    limit: 200,
  })) as QueryResponse<TechniqueRowMin>
  return res.rows.filter((r) => r.slug)
}

async function fetchStates(client: BeamClient): Promise<StateRowMin[]> {
  const res = (await client.query('states', {
    fields: ['fips', 'code', 'slug', 'name'],
    limit: 100,
  })) as QueryResponse<StateRowMin>
  return res.rows.filter((r) => r.slug)
}

async function fetchCounties(client: BeamClient): Promise<CountyRowMin[]> {
  const res = (await client.query('counties', {
    fields: ['fips', 'slug', 'stateFips', 'countyName'],
    limit: 5000,
  })) as QueryResponse<CountyRowMin>
  return res.rows.filter((r) => r.slug && r.stateFips)
}

async function fetchFacts(client: BeamClient): Promise<FactRowMin[]> {
  const res = (await client.query('wildFacts', {
    fields: ['id', 'slug', 'body', 'citationUrl'],
    limit: 1000,
  })) as QueryResponse<FactRowMin>
  return res.rows.filter((r) => r.slug)
}

async function fetchHomeStats(
  client: BeamClient,
): Promise<{ tickCount: number; diseaseCount: number; stateCount: number }> {
  const [t, d, s] = await Promise.all([
    client.query('ticks', { fields: ['id'], limit: 200 }) as Promise<QueryResponse<unknown>>,
    client.query('diseases', { fields: ['id'], limit: 200 }) as Promise<QueryResponse<unknown>>,
    client.query('states', { fields: ['fips'], limit: 100 }) as Promise<QueryResponse<unknown>>,
  ])
  return {
    tickCount: t.rows.length,
    diseaseCount: d.rows.length,
    stateCount: s.rows.length,
  }
}

async function fetchDiseaseTotals(
  client: BeamClient,
  diseases: DiseaseRowMin[],
): Promise<Map<number, { totalCases: number; states: number }>> {
  const out = new Map<number, { totalCases: number; states: number }>()
  await Promise.all(
    diseases.map(async (d) => {
      try {
        const res = (await client.analyze('diseaseCountyYear', 'casesByState', {
          where: { diseaseId: d.id },
        })) as AnalyzeResult<{ stateFips: unknown }, { total: number }>
        let total = 0
        const stateSet = new Set<string>()
        for (const b of res.buckets) {
          const fips = String(b.dims.stateFips ?? '')
          const v = b.measures.total ?? 0
          total += v
          if (fips) stateSet.add(fips)
        }
        out.set(d.id, { totalCases: total, states: stateSet.size })
      } catch {
        out.set(d.id, { totalCases: 0, states: 0 })
      }
    }),
  )
  return out
}

async function fetchDiseasePeakMonths(
  client: BeamClient,
  diseases: DiseaseRowMin[],
): Promise<Map<number, string | null>> {
  const out = new Map<number, string | null>()
  await Promise.all(
    diseases.map(async (d) => {
      try {
        const res = (await client.analyze('diseaseMonth', 'seasonality', {
          where: { diseaseId: d.id },
        })) as AnalyzeResult<{ month: number }, { total: number }>
        const months = new Array<number>(12).fill(0)
        let totalAcrossYear = 0
        for (const b of res.buckets) {
          const m = Number(b.dims.month)
          if (!Number.isFinite(m) || m < 1 || m > 12) continue
          const v = b.measures.total ?? 0
          months[m - 1] += v
          totalAcrossYear += v
        }
        out.set(d.id, peakMonthName(months, totalAcrossYear))
      } catch {
        out.set(d.id, null)
      }
    }),
  )
  return out
}

async function fetchTickDiseaseCounts(
  client: BeamClient,
  ticks: TickRowMin[],
): Promise<Map<number, number>> {
  const out = new Map<number, number>()
  await Promise.all(
    ticks.map(async (t) => {
      try {
        const res = (await client.query('tickDiseases', {
          where: { tickId: t.id },
          fields: ['diseaseId'],
          limit: 100,
        })) as QueryResponse<{ diseaseId: number }>
        out.set(t.id, res.rows.length)
      } catch {
        out.set(t.id, 0)
      }
    }),
  )
  return out
}

async function fetchTickRangeStats(
  client: BeamClient,
  ticks: TickRowMin[],
): Promise<Map<number, { counties: number; states: number }>> {
  const out = new Map<number, { counties: number; states: number }>()
  await Promise.all(
    ticks.map(async (t) => {
      try {
        const res = (await client.analyze('tickCounty', 'establishedByState', {
          where: { tickId: t.id },
        })) as AnalyzeResult<{ stateFips: unknown }, { counties: number }>
        let counties = 0
        const stateSet = new Set<string>()
        for (const b of res.buckets) {
          const fips = String(b.dims.stateFips ?? '')
          const c = b.measures.counties ?? 0
          counties += c
          if (fips && c > 0) stateSet.add(fips)
        }
        out.set(t.id, { counties, states: stateSet.size })
      } catch {
        out.set(t.id, { counties: 0, states: 0 })
      }
    }),
  )
  return out
}

async function fetchCountyTopCases(client: BeamClient): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  try {
    const res = (await client.analyze('diseaseCountyYear', 'countyHotspots', {})) as AnalyzeResult<
      { countyFips: string },
      { total: number }
    >
    for (const b of res.buckets) {
      const fips = String(b.dims.countyFips ?? '')
      if (!fips) continue
      out.set(fips, b.measures.total ?? 0)
    }
  } catch {
    // Non-fatal: county sampling falls back to first-N order.
  }
  return out
}

async function fetchStateTopStats(
  client: BeamClient,
  states: StateRowMin[],
): Promise<Map<string, { tickCount: number; countyEstablished: number; diseaseCount: number }>> {
  const out = new Map<string, { tickCount: number; countyEstablished: number; diseaseCount: number }>()
  for (const s of states) {
    out.set(s.fips, { tickCount: 0, countyEstablished: 0, diseaseCount: 0 })
  }

  // Both analyses hop stateFips through `county`, so the where filter
  // can't push down. Read each grid once and aggregate client-side.
  try {
    const tickRes = (await client.analyze('tickCounty', 'establishedByState', {})) as AnalyzeResult<
      { tickId: unknown; stateFips: unknown },
      { counties: number }
    >
    const tickIdsByState = new Map<string, Set<number>>()
    const countiesByState = new Map<string, number>()
    for (const b of tickRes.buckets) {
      const fips = String(b.dims.stateFips ?? '')
      const tickId = Number(b.dims.tickId)
      const counties = b.measures.counties ?? 0
      if (!fips || !Number.isFinite(tickId) || counties <= 0) continue
      let set = tickIdsByState.get(fips)
      if (!set) {
        set = new Set<number>()
        tickIdsByState.set(fips, set)
      }
      set.add(tickId)
      countiesByState.set(fips, (countiesByState.get(fips) ?? 0) + counties)
    }
    for (const s of states) {
      const cur = out.get(s.fips)!
      cur.tickCount = tickIdsByState.get(s.fips)?.size ?? 0
      cur.countyEstablished = countiesByState.get(s.fips) ?? 0
    }
  } catch (err) {
    console.warn(
      `⚠ tickCounty.establishedByState failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  try {
    const diseaseRes = (await client.analyze('diseaseCountyYear', 'casesByState', {})) as AnalyzeResult<
      { diseaseId: unknown; stateFips: unknown },
      { total: number }
    >
    const diseasesByState = new Map<string, Set<number>>()
    for (const b of diseaseRes.buckets) {
      const fips = String(b.dims.stateFips ?? '')
      const diseaseId = Number(b.dims.diseaseId)
      const total = b.measures.total ?? 0
      if (!fips || !Number.isFinite(diseaseId) || total <= 0) continue
      let set = diseasesByState.get(fips)
      if (!set) {
        set = new Set<number>()
        diseasesByState.set(fips, set)
      }
      set.add(diseaseId)
    }
    for (const s of states) {
      const cur = out.get(s.fips)!
      cur.diseaseCount = diseasesByState.get(s.fips)?.size ?? 0
    }
  } catch (err) {
    console.warn(
      `⚠ diseaseCountyYear.casesByState failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  return out
}

// ── Helpers ──

function dangerOf(level: string | null | undefined): 'high' | 'mod' | 'low' | null {
  switch (level) {
    case 'high': return 'high'
    case 'medium': return 'mod'
    case 'low': return 'low'
    default: return null
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']

function peakMonthName(months: number[], total: number): string | null {
  if (total <= 0) return null
  let topIdx = 0
  let topVal = months[0]!
  for (let i = 1; i < 12; i++) {
    if (months[i]! > topVal) {
      topVal = months[i]!
      topIdx = i
    }
  }
  if (topVal <= 0 || topVal / total < 0.12) return null
  return MONTH_LONG[topIdx] ?? MONTHS[topIdx] ?? null
}

function diseaseSubLabel(kind: string): string {
  switch (kind) {
    case 'disease-states':       return 'STATE BREAKDOWN'
    case 'disease-seasonality':  return 'SEASONALITY'
    case 'disease-ticks':        return 'TICKS THAT CARRY IT'
    case 'disease-pathogens':    return 'PATHOGENS'
    case 'disease-history':      return 'HISTORY'
    default:                     return 'DISEASE'
  }
}
function diseaseSubName(kind: string): string {
  switch (kind) {
    case 'disease-states':       return 'States'
    case 'disease-seasonality':  return 'Seasonality'
    case 'disease-ticks':        return 'Ticks'
    case 'disease-pathogens':    return 'Pathogens'
    case 'disease-history':      return 'History'
    default:                     return ''
  }
}
function diseaseSubDescription(kind: string, name: string): string {
  switch (kind) {
    case 'disease-states':       return `Where ${name} concentrates — state-by-state CDC totals on a US choropleth.`
    case 'disease-seasonality':  return `When ${name} peaks across the calendar year — month-over-month CDC totals.`
    case 'disease-ticks':        return `Tick species that carry ${name} — with links to each field-guide entry.`
    case 'disease-pathogens':    return `Pathogens that cause ${name} — canonical names, aliases, and sameAs links.`
    case 'disease-history':      return `Year-over-year CDC case totals for ${name}.`
    default:                     return name
  }
}
function stateSubLabel(kind: string): string {
  switch (kind) {
    case 'state-ticks':    return 'TICK SPECIES'
    case 'state-diseases': return 'DISEASE CASES'
    case 'state-counties': return 'COUNTIES'
    default:               return 'STATE'
  }
}
function stateSubName(kind: string): string {
  switch (kind) {
    case 'state-ticks':    return 'Ticks'
    case 'state-diseases': return 'Diseases'
    case 'state-counties': return 'Counties'
    default:               return ''
  }
}
function stateSubDescription(kind: string, name: string): string {
  switch (kind) {
    case 'state-ticks':    return `Tick species established in ${name} — prevalence, peak months, and the diseases each carries.`
    case 'state-diseases': return `CDC-reported tick-borne disease cases in ${name}, by disease and county.`
    case 'state-counties': return `Every county in ${name} — FIPS codes and links through to the county pages.`
    default:               return name
  }
}

// County URLs that the e2e SEO contract pins by name
// (apps/e2e/src/scenarios/seo/og.spec.ts). These are emitted regardless
// of the case-load sample so the contract can't silently regress when
// surveillance numbers shift.
const PINNED_COUNTY_KEYS: ReadonlySet<string> = new Set([
  'maine/cumberland',
])

function sampleCounties(
  urls: readonly CanonicalUrl[],
  topCases: Map<string, number>,
  countiesByKey: Map<string, CountyRowMin>,
  cap: number | null,
): Set<string> {
  const countyKeys: Array<{ key: string; rank: number }> = []
  for (const url of urls) {
    if (url.kind !== 'county') continue
    if (!url.parentSlug || !url.slug) continue
    if (url.parentSlug === 'unknown-state') continue
    const key = `${url.parentSlug}/${url.slug}`
    const fips = countiesByKey.get(key)?.fips
    const rank = fips ? topCases.get(fips) ?? 0 : 0
    countyKeys.push({ key, rank })
  }
  if (cap === null) return new Set(countyKeys.map((c) => c.key))
  countyKeys.sort((a, b) => b.rank - a.rank)
  const picked = new Set(countyKeys.slice(0, cap).map((c) => c.key))
  for (const key of PINNED_COUNTY_KEYS) {
    if (countiesByKey.has(key)) picked.add(key)
  }
  return picked
}

export function pathToOgFile(distDir: string, ogPath: string): string {
  // /og-default.png      → dist/og-default.png
  // /og/ticks/x.png      → dist/og/ticks/x.png
  const trimmed = ogPath.replace(/^\/+/, '')
  return resolve(distDir, trimmed)
}

function loadDotenv(path: string): void {
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
  console.error('✗ build:og failed:', err)
  process.exit(1)
})
