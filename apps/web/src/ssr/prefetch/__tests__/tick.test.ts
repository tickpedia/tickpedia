import { describe, it, expect, vi } from 'vitest'
import { prefetchTickPage } from '../tick.js'
import {
  tickCacheKey,
  tickRangeCacheKey,
  tickDiseasesCacheKey,
} from '../../../pages/tick/data/cache-keys.js'

// Smoke-test the prefetch contract — the data shapes the cache emits
// have to match what the SSR-aware hooks read on first render. If
// either side drifts, hydration breaks silently.

interface FakeClient {
  query: ReturnType<typeof vi.fn>
  analyze: ReturnType<typeof vi.fn>
}

function fakeClient(): FakeClient {
  return { query: vi.fn(), analyze: vi.fn() }
}

const TICK = {
  id: 42,
  slug: 'lone-star-tick',
  commonName: 'Lone star tick',
  scientificName: 'Amblyomma americanum',
  oneLiner: 'Aggressive biter; the alpha-gal vector.',
  heroPhotoUrl: null,
  heroHeadColor: null,
  heroBodyColor: null,
  heroLegColor: null,
  dangerLevel: 'high',
}

function setupTickQueries(client: FakeClient): void {
  // Returns ticks/tickDiseases/diseases for any query() call by lens name.
  client.query.mockImplementation((lensName: string) => {
    if (lensName === 'ticks') return Promise.resolve({ rows: [TICK] })
    if (lensName === 'tickDiseases')
      return Promise.resolve({ rows: [{ diseaseId: 5 }, { diseaseId: 7 }] })
    if (lensName === 'diseases')
      return Promise.resolve({
        rows: [
          { id: 5, slug: 'lyme-disease', displayName: 'Lyme disease', oneLiner: 'A bacterial infection.' },
          { id: 6, slug: 'rmsf', displayName: 'RMSF', oneLiner: null },
          { id: 7, slug: 'anaplasmosis', displayName: 'Anaplasmosis', oneLiner: null },
        ],
      })
    return Promise.resolve({ rows: [] })
  })
  client.analyze.mockImplementation((lensName: string, analyzeName: string) => {
    if (lensName !== 'tickCounty') return Promise.resolve({ buckets: [] })
    if (analyzeName === 'establishedByState')
      return Promise.resolve({
        buckets: [
          { dims: { tickId: 42, stateFips: '23' }, measures: { counties: 14 } },
          { dims: { tickId: 42, stateFips: '36' }, measures: { counties: 22 } },
        ],
      })
    if (analyzeName === 'spreadOverTime')
      return Promise.resolve({
        buckets: [
          { dims: { tickId: 42, year: 2020 }, measures: { counties: 100 } },
          { dims: { tickId: 42, year: 2022 }, measures: { counties: 130 } },
          { dims: { tickId: 42, year: 2021 }, measures: { counties: 120 } },
        ],
      })
    return Promise.resolve({ buckets: [] })
  })
}

describe('prefetchTickPage', () => {
  it('returns null when the slug is unknown', async () => {
    const client = fakeClient()
    client.query.mockResolvedValue({ rows: [] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = await prefetchTickPage(client as any, 'not-real')
    expect(out).toBeNull()
    // The follow-up reads must not fire — we don't have a tickId.
    expect(client.analyze).not.toHaveBeenCalled()
  })

  it('emits cache entries keyed for every hook the page uses', async () => {
    const client = fakeClient()
    setupTickQueries(client)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = await prefetchTickPage(client as any, 'lone-star-tick')
    expect(out).not.toBeNull()
    if (!out) return

    expect(out.cache[tickCacheKey('lone-star-tick')]).toMatchObject({
      slug: 'lone-star-tick',
      commonName: 'Lone star tick',
    })
    expect(out.cache[tickRangeCacheKey(42)]).toEqual({
      byStateFips: { '23': 14, '36': 22 },
      spread: [
        { year: 2020, counties: 100 },
        { year: 2021, counties: 120 },
        { year: 2022, counties: 130 },
      ],
    })
    expect(out.cache[tickDiseasesCacheKey(42)]).toEqual([
      { id: 7, slug: 'anaplasmosis', displayName: 'Anaplasmosis', oneLiner: null },
      { id: 5, slug: 'lyme-disease', displayName: 'Lyme disease', oneLiner: 'A bacterial infection.' },
    ])
  })

  it('produces a PageHead matching buildTickHead for the loaded row', async () => {
    const client = fakeClient()
    setupTickQueries(client)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = await prefetchTickPage(client as any, 'lone-star-tick')
    expect(out?.head.title).toBe('Lone star tick — Ticks | Tickpedia')
    expect(out?.head.canonicalPath).toBe('/ticks/lone-star-tick')
    expect(out?.head.description).toContain('Aggressive biter')
  })
})
