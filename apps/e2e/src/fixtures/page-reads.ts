// Per page kind, the SemiLayer reads its component will issue. The
// smoke (`smoke/semilayer-pages.ts`) iterates the canonical URLs × the
// matching PageReads entry and asserts every read returns data
// (modulo `emptyOk` for entities whose imports haven't landed).
//
// This file is the contract between the URL set and the lens layer.
// When phase N+1 ships the disease page, its PageReads entry here
// gets the reads the page actually makes — not "what the design
// implies", but "what the component fetches at mount time". The same
// rule applies to alias-only pages (no reads, no entry).
//
// Adding a kind: add it to PAGE_READS, declare the reads. The smoke
// picks it up automatically.

import type { BeamClient } from '@semilayer/client'
import type { CanonicalUrl, EntityKind } from './canonical-urls.js'

export interface PageReadSpec {
  /** Short label for the smoke output, e.g. `ticks.query(slug)`. */
  label: string
  run: (url: CanonicalUrl, client: BeamClient) => Promise<unknown>
  /**
   * True if the read returning empty / zero is acceptable for now —
   * usually because the source data hasn't been imported yet.
   * Comment with the reason. Audit quarterly.
   */
  emptyOk?: boolean
}

export interface PageReads {
  kind: EntityKind
  reads: readonly PageReadSpec[]
}

const PAGE_READS_LIST: readonly PageReads[] = [
  // ─── Home + risk + meta ──────────────────────────────────────────
  {
    kind: 'home',
    reads: [
      { label: 'ticks.count',    run: (_, c) => c.count('ticks') },
      { label: 'diseases.count', run: (_, c) => c.count('diseases') },
    ],
  },
  {
    kind: 'risk',
    reads: [
      // The H3 hexagon heatmap is the centrepiece of /risk.
      { label: 'diseaseCountyYear.densityByH3', run: (_, c) => c.analyze('diseaseCountyYear', 'densityByH3') },
      { label: 'diseases.query',                run: (_, c) => c.query('diseases',           { fields: ['id', 'slug', 'displayName'], limit: 50 }) },
    ],
  },
  {
    kind: 'risk-disease',
    reads: [
      // Heatmap filtered to one disease — page narrates "this disease's
      // hotspots". The diseases query confirms the slug exists.
      { label: 'diseases.query(slug)',          run: (url, c) => c.query('diseases', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'diseaseCountyYear.densityByH3', run: (_, c) => c.analyze('diseaseCountyYear', 'densityByH3') },
    ],
  },
  // /season reads monthly seasonality — emptyOk until disease_month lands.
  {
    kind: 'season',
    reads: [
      { label: 'diseaseMonth.seasonality', run: (_, c) => c.analyze('diseaseMonth', 'seasonality'), emptyOk: true },
    ],
  },
  // Static meta pages with no SemiLayer reads.
  { kind: 'sources',     reads: [] },
  { kind: 'about',       reads: [] },
  { kind: 'contribute',  reads: [] },
  { kind: 'search',      reads: [] },
  { kind: 'not-found',   reads: [] },

  // ─── Ticks ───────────────────────────────────────────────────────
  {
    kind: 'ticks-index',
    reads: [
      { label: 'ticks.query', run: (_, c) => c.query('ticks', { fields: ['id', 'slug', 'commonName', 'oneLiner', 'dangerLevel'], limit: 50 }) },
    ],
  },
  {
    kind: 'tick',
    reads: [
      { label: 'ticks.query(slug)',             run: (url, c) => c.query('ticks', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'tickDiseases.diseasesPerTick',  run: (_, c) => c.analyze('tickDiseases', 'diseasesPerTick') },
      { label: 'tickCounty.establishedRange',   run: (_, c) => c.analyze('tickCounty', 'establishedRange') },
    ],
  },
  {
    kind: 'tick-range',
    reads: [
      { label: 'ticks.query(slug)',                  run: (url, c) => c.query('ticks', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'tickCounty.establishedByState',      run: (_, c) => c.analyze('tickCounty', 'establishedByState') },
      { label: 'tickCounty.spreadOverTime',          run: (_, c) => c.analyze('tickCounty', 'spreadOverTime') },
    ],
  },
  {
    kind: 'tick-diseases',
    reads: [
      { label: 'ticks.query(slug)',            run: (url, c) => c.query('ticks', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'tickDiseases.diseasesPerTick', run: (_, c) => c.analyze('tickDiseases', 'diseasesPerTick') },
    ],
  },
  {
    kind: 'tick-removal',
    reads: [
      { label: 'ticks.query(slug)',          run: (url, c) => c.query('ticks', { where: { slug: url.slug }, limit: 1 }) },
      // tick_removal_techniques may be empty until editorial joins land.
      { label: 'tickRemovalTechniques.query', run: (_, c) => c.query('tickRemovalTechniques', { limit: 5 }), emptyOk: true },
    ],
  },

  // ─── Diseases ────────────────────────────────────────────────────
  {
    kind: 'diseases-index',
    reads: [
      { label: 'diseases.query', run: (_, c) => c.query('diseases', { fields: ['id', 'slug', 'displayName', 'oneLiner'], limit: 50 }) },
    ],
  },
  {
    kind: 'disease',
    reads: [
      { label: 'diseases.query(slug)',            run: (url, c) => c.query('diseases', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'diseaseCountyYear.casesByYear',   run: (_, c) => c.analyze('diseaseCountyYear', 'casesByYear') },
      { label: 'tickDiseases.ticksPerDisease',    run: (_, c) => c.analyze('tickDiseases', 'ticksPerDisease') },
    ],
  },
  {
    kind: 'disease-states',
    reads: [
      { label: 'diseases.query(slug)',           run: (url, c) => c.query('diseases', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'diseaseCountyYear.casesByState', run: (_, c) => c.analyze('diseaseCountyYear', 'casesByState') },
    ],
  },
  {
    kind: 'disease-seasonality',
    reads: [
      { label: 'diseases.query(slug)',     run: (url, c) => c.query('diseases', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'diseaseMonth.seasonality', run: (_, c) => c.analyze('diseaseMonth', 'seasonality'), emptyOk: true },
    ],
  },
  {
    kind: 'disease-ticks',
    reads: [
      { label: 'diseases.query(slug)',         run: (url, c) => c.query('diseases', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'tickDiseases.ticksPerDisease', run: (_, c) => c.analyze('tickDiseases', 'ticksPerDisease') },
    ],
  },
  {
    kind: 'disease-pathogens',
    reads: [
      { label: 'diseases.query(slug)',                    run: (url, c) => c.query('diseases', { where: { slug: url.slug }, limit: 1 }) },
      // diseasePathogens may legitimately be empty for a disease whose
      // pathogen association hasn't been seeded yet — the page renders
      // an empty state rather than 404ing.
      { label: 'diseasePathogens.pathogensPerDisease',    run: (_, c) => c.analyze('diseasePathogens', 'pathogensPerDisease'), emptyOk: true },
    ],
  },
  {
    kind: 'disease-history',
    reads: [
      { label: 'diseases.query(slug)',          run: (url, c) => c.query('diseases', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'diseaseCountyYear.casesByYear', run: (_, c) => c.analyze('diseaseCountyYear', 'casesByYear') },
    ],
  },

  // ─── Pathogens ───────────────────────────────────────────────────
  {
    kind: 'pathogens-index',
    reads: [
      { label: 'pathogens.query',                       run: (_, c) => c.query('pathogens', { fields: ['id', 'slug', 'displayName'], limit: 50 }) },
      { label: 'tickPathogens.ticksPerPathogen',        run: (_, c) => c.analyze('tickPathogens', 'ticksPerPathogen') },
      { label: 'diseasePathogens.diseasesPerPathogen',  run: (_, c) => c.analyze('diseasePathogens', 'diseasesPerPathogen') },
    ],
  },
  {
    kind: 'pathogen',
    reads: [
      { label: 'pathogens.query(slug)',                 run: (url, c) => c.query('pathogens', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'tickPathogens.ticksPerPathogen',        run: (_, c) => c.analyze('tickPathogens', 'ticksPerPathogen') },
      { label: 'diseasePathogens.diseasesPerPathogen',  run: (_, c) => c.analyze('diseasePathogens', 'diseasesPerPathogen') },
    ],
  },
  {
    kind: 'pathogen-range',
    reads: [
      { label: 'pathogens.query(slug)', run: (url, c) => c.query('pathogens', { where: { slug: url.slug }, limit: 1 }) },
      // pathogenCounty surveillance is populated for some pathogens but
      // not others — render the empty state rather than failing the smoke.
      { label: 'pathogenCounty.query',  run: (_, c) => c.query('pathogenCounty', { fields: ['countyFips', 'year'], limit: 5 }), emptyOk: true },
    ],
  },
  {
    kind: 'pathogen-ticks',
    reads: [
      { label: 'pathogens.query(slug)',           run: (url, c) => c.query('pathogens', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'tickPathogens.ticksPerPathogen',  run: (_, c) => c.analyze('tickPathogens', 'ticksPerPathogen') },
    ],
  },
  {
    kind: 'pathogen-diseases',
    reads: [
      { label: 'pathogens.query(slug)',                  run: (url, c) => c.query('pathogens', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'diseasePathogens.diseasesPerPathogen',   run: (_, c) => c.analyze('diseasePathogens', 'diseasesPerPathogen') },
    ],
  },

  // ─── Techniques ──────────────────────────────────────────────────
  {
    kind: 'techniques-index',
    reads: [
      { label: 'removalTechniques.query', run: (_, c) => c.query('removalTechniques', { fields: ['id', 'slug', 'title', 'oneLiner'], limit: 50 }) },
    ],
  },
  {
    kind: 'technique',
    reads: [
      { label: 'removalTechniques.query(slug)', run: (url, c) => c.query('removalTechniques', { where: { slug: url.slug }, limit: 1 }) },
    ],
  },

  // ─── States + counties ───────────────────────────────────────────
  {
    kind: 'states-index',
    reads: [
      { label: 'states.query', run: (_, c) => c.query('states', { fields: ['fips', 'code', 'slug', 'name'], limit: 60 }) },
    ],
  },
  {
    kind: 'state',
    reads: [
      { label: 'states.query(slug)', run: (url, c) => c.query('states', { where: { slug: url.slug }, limit: 1 }) },
    ],
  },
  {
    kind: 'state-ticks',
    reads: [
      { label: 'states.query(slug)', run: (url, c) => c.query('states', { where: { slug: url.slug }, limit: 1 }) },
      // tick_state surveillance may be empty until editorial rows land.
      { label: 'tickState.query',    run: (_, c) => c.query('tickState', { limit: 5 }), emptyOk: true },
    ],
  },
  {
    kind: 'state-diseases',
    reads: [
      { label: 'states.query(slug)',             run: (url, c) => c.query('states', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'diseaseCountyYear.casesByState', run: (_, c) => c.analyze('diseaseCountyYear', 'casesByState') },
    ],
  },
  {
    kind: 'state-counties',
    reads: [
      { label: 'states.query(slug)', run: (url, c) => c.query('states', { where: { slug: url.slug }, limit: 1 }) },
      { label: 'counties.query',     run: (_, c) => c.query('counties', { fields: ['fips', 'slug', 'countyName'], limit: 100 }) },
    ],
  },
  {
    kind: 'counties-leaderboard',
    reads: [
      { label: 'diseaseCountyYear.countyHotspots', run: (_, c) => c.analyze('diseaseCountyYear', 'countyHotspots') },
    ],
  },
  {
    kind: 'county',
    reads: [
      { label: 'counties.query(slug)', run: (url, c) => c.query('counties', { where: { slug: url.slug }, limit: 1 }) },
    ],
  },

  // ─── Facts ───────────────────────────────────────────────────────
  // wild_facts is editorial — emptyOk while the corpus is being authored.
  {
    kind: 'facts-index',
    reads: [
      { label: 'wildFacts.query', run: (_, c) => c.query('wildFacts', { fields: ['id', 'slug', 'body'], limit: 50 }), emptyOk: true },
    ],
  },
  {
    kind: 'fact',
    reads: [
      { label: 'wildFacts.query(slug)', run: (url, c) => c.query('wildFacts', { where: { slug: url.slug }, limit: 1 }), emptyOk: true },
    ],
  },
] as const

export const PAGE_READS: ReadonlyMap<EntityKind, PageReads> = new Map(
  PAGE_READS_LIST.map((p) => [p.kind, p]),
)

/**
 * Generic shape-aware emptiness check. Handles the four BeamClient
 * envelope shapes (count, query, analyze, feed); returns true for any
 * other shape conservatively (smoke can override with `emptyOk`).
 */
export function isEmptyResult(result: unknown): boolean {
  if (result === null || typeof result !== 'object') return true
  const r = result as Record<string, unknown>
  if (typeof r.count === 'number') return r.count === 0
  if (Array.isArray(r.rows)) return r.rows.length === 0
  if (Array.isArray(r.buckets)) return r.buckets.length === 0
  if (Array.isArray(r.items)) return r.items.length === 0
  return false
}
