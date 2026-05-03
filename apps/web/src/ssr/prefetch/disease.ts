import type { BeamClient } from '@semilayer/client'
import type { DataCache } from '../SSRDataProvider.js'
import type { PageHead } from '../../pages/shared/seo/index.js'
import type { DiseaseRow } from '../../pages/disease/data/useDisease.js'
import type { DiseaseStatesData } from '../../pages/disease/data/useDiseaseStates.js'
import type { DiseaseSeasonalityData } from '../../pages/disease/data/useDiseaseSeasonality.js'
import type { DiseaseHistoryData } from '../../pages/disease/data/useDiseaseHistory.js'
import type { DiseaseTickRow } from '../../pages/disease/data/useDiseaseTicks.js'
import type { DiseasePathogenRow } from '../../pages/disease/data/useDiseasePathogens.js'
import {
  diseaseCacheKey,
  diseaseStatesCacheKey,
  diseaseSeasonalityCacheKey,
  diseaseHistoryCacheKey,
  diseaseTicksCacheKey,
  diseasePathogensCacheKey,
} from '../../pages/disease/data/cache-keys.js'
import { pickPeakMonth } from '../../pages/disease/data/peak-month.js'
import { buildDiseaseHead } from '../../pages/disease/seo.js'
import { stateNameFor } from '../../charts/Choropleth/states.js'

// Build-time prefetch for /diseases/[slug] and its sub-pages. Returns
// null when the slug is unknown — the caller skips that URL.

interface AnalyzeBucket<D, M> {
  dims: D
  measures: M
}
interface AnalyzeResult<D, M> {
  buckets: Array<AnalyzeBucket<D, M>>
}
interface QueryResponse<T> {
  rows: T[]
}

export interface DiseasePagePrefetch {
  cache: DataCache
  head: PageHead
  disease: DiseaseRow
}

export async function prefetchDiseasePage(
  client: BeamClient,
  slug: string,
): Promise<DiseasePagePrefetch | null> {
  const diseaseRes = (await client.query('diseases', {
    where: { slug },
    fields: ['id', 'slug', 'displayName', 'oneLiner', 'aliases'],
    limit: 1,
  })) as QueryResponse<DiseaseRow>
  const disease = diseaseRes.rows[0]
  if (!disease) return null

  const diseaseId = disease.id

  const [
    statesRes,
    seasonalityRes,
    historyRes,
    tickJoinRes,
    ticksRes,
    pathogenJoinRes,
    pathogensRes,
  ] = await Promise.all([
    client.analyze('diseaseCountyYear', 'casesByState', {
      where: { diseaseId },
    }) as Promise<AnalyzeResult<{ stateFips: unknown }, { total: number }>>,
    client.analyze('diseaseMonth', 'seasonality', {
      where: { diseaseId },
    }) as Promise<AnalyzeResult<{ month: number }, { total: number }>>,
    client.analyze('diseaseCountyYear', 'casesByYear', {
      where: { diseaseId },
    }) as Promise<AnalyzeResult<{ year: number }, { total: number; counties: number }>>,
    client.query('tickDiseases', {
      where: { diseaseId },
      fields: ['tickId'],
      limit: 50,
    }) as Promise<QueryResponse<{ tickId: number }>>,
    client.query('ticks', {
      fields: ['id', 'slug', 'commonName', 'scientificName', 'oneLiner'],
      limit: 100,
    }) as Promise<
      QueryResponse<{
        id: number
        slug: string
        commonName: string
        scientificName: string
        oneLiner: string | null
      }>
    >,
    client.query('diseasePathogens', {
      where: { diseaseId },
      fields: ['pathogenId'],
      limit: 20,
    }) as Promise<QueryResponse<{ pathogenId: number }>>,
    client.query('pathogens', {
      fields: ['id', 'slug', 'displayName', 'scientificName', 'oneLiner'],
      limit: 100,
    }) as Promise<
      QueryResponse<{
        id: number
        slug: string
        displayName: string
        scientificName: string
        oneLiner: string | null
      }>
    >,
  ])

  // States rollup
  const byStateFips: Record<string, number> = {}
  let total = 0
  for (const b of statesRes.buckets) {
    const fips = String(b.dims.stateFips ?? '')
    if (!fips) continue
    const v = b.measures.total ?? 0
    byStateFips[fips] = (byStateFips[fips] ?? 0) + v
    total += v
  }
  const stateCount = Object.keys(byStateFips).length
  const states: DiseaseStatesData = { byStateFips, total, stateCount }

  // Seasonality rollup
  const months = new Array<number>(12).fill(0)
  let seasonalityTotal = 0
  for (const b of seasonalityRes.buckets) {
    const m = Number(b.dims.month)
    if (!Number.isFinite(m) || m < 1 || m > 12) continue
    const v = b.measures.total ?? 0
    months[m - 1] = (months[m - 1] ?? 0) + v
    seasonalityTotal += v
  }
  const seasonality: DiseaseSeasonalityData = { months, total: seasonalityTotal }
  const peak = pickPeakMonth(seasonality)

  // History rollup
  const historyRows = historyRes.buckets
    .map((b) => ({
      year: Number(b.dims.year),
      count: b.measures.total ?? 0,
      counties: b.measures.counties ?? 0,
    }))
    .filter((r) => Number.isFinite(r.year))
    .sort((a, b) => a.year - b.year)
  const historyTotal = historyRows.reduce((s, r) => s + r.count, 0)
  const latestYear = historyRows.at(-1)?.year ?? null
  const history: DiseaseHistoryData = { rows: historyRows, total: historyTotal, latestYear }

  // Ticks rollup
  const tickIds = new Set(tickJoinRes.rows.map((r) => r.tickId))
  const tickRows: DiseaseTickRow[] = ticksRes.rows
    .filter((t) => tickIds.has(t.id))
    .map((t) => ({
      id: t.id,
      slug: t.slug ?? '',
      commonName: t.commonName ?? '',
      scientificName: t.scientificName ?? '',
      oneLiner: t.oneLiner ?? null,
    }))
    .sort((a, b) => a.commonName.localeCompare(b.commonName))

  // Pathogens rollup
  const pathogenIds = new Set(pathogenJoinRes.rows.map((r) => r.pathogenId))
  const pathogenRows: DiseasePathogenRow[] = pathogensRes.rows
    .filter((p) => pathogenIds.has(p.id))
    .map((p) => ({
      id: p.id,
      slug: p.slug ?? '',
      displayName: p.displayName ?? '',
      scientificName: p.scientificName ?? '',
      oneLiner: p.oneLiner ?? null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const cache: DataCache = {
    [diseaseCacheKey(slug)]: disease,
    [diseaseStatesCacheKey(diseaseId)]: states,
    [diseaseSeasonalityCacheKey(diseaseId)]: seasonality,
    [diseaseHistoryCacheKey(diseaseId)]: history,
    [diseaseTicksCacheKey(diseaseId)]: tickRows,
    [diseasePathogensCacheKey(diseaseId)]: pathogenRows,
  }

  const head = buildDiseaseHead(disease, {
    totalCases: total,
    states: stateCount,
    topPathogen: pathogenRows[0]?.displayName ?? null,
    peakMonth: peak.monthName,
  })

  return { cache, head, disease }
}

/** Top state name (display form) — read by callers that want it for prerender summaries. */
export function pickTopStateName(byStateFips: Record<string, number>): string | null {
  let topFips: string | null = null
  let topCount = 0
  for (const [fips, count] of Object.entries(byStateFips)) {
    if (count > topCount) {
      topCount = count
      topFips = fips
    }
  }
  if (!topFips) return null
  const code = USPS_BY_FIPS[topFips]
  return code ? stateNameFor(code) : null
}

const USPS_BY_FIPS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
  '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI',
  '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY',
}
