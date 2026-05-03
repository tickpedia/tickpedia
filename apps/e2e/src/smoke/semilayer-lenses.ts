// Smoke test for the SemiLayer config: hit every queryable lens with
// the public read key (`pk_…`), confirm we get rows in the expected
// shape, exercise every public feed, and run every public analyze
// metric end-to-end. Exits non-zero on failure.
//
// Run me after `pnpm semilayer:push` / `pnpm semilayer:generate` to
// verify the live tenant matches the local config.
//
//   pnpm smoke:lenses
//
// (Companion `pnpm smoke:pages` lives next door as
// `src/smoke/semilayer-pages.ts` — it iterates the canonical URL
// contract and asserts every page's reads return data.)
//
// Required env (loaded from the repo-root .env via tsx --env-file):
//   SEMILAYER_SERVICE_URL          e.g. https://api.semilayer.com
//   NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY   pk_prod_…
//
// We deliberately use the public key, not the service key, so this
// exercises the same access path the public site does. Editorial-only
// metrics (`factCoverage`, `recencyOfData`) have no public grant; they
// ride the admin's service key from server actions and are out of
// scope for this smoke.
//
// Every analyze runs end-to-end via `client.analyze()`; the smoke
// asserts envelope, non-empty buckets where data exists, and a
// per-metric expected `meta.strategy` so a silent fallback to
// streaming would fail loudly. Most analyses use `pushdown`; the
// two with `dim.through` use `through` (the planner hops the
// declared belongsTo relation).

import { BeamClient } from '@semilayer/client'

interface LensCheck {
  lens: string
  expectedFields: readonly string[]
  // A lens may legitimately be empty (e.g. tickState before editorial
  // rows are added). emptyOk = true silences "no rows returned" while
  // still verifying the route + auth work.
  emptyOk?: boolean
}

const LENS_CHECKS: readonly LensCheck[] = [
  { lens: 'ticks', expectedFields: ['id', 'slug', 'commonName', 'scientificName'] },
  { lens: 'wildFacts', expectedFields: ['id', 'slug', 'body'], emptyOk: true },
  { lens: 'removalTechniques', expectedFields: ['id', 'slug', 'title'] },
  { lens: 'states', expectedFields: ['fips', 'code', 'slug', 'name'] },
  { lens: 'counties', expectedFields: ['fips', 'stateFips', 'countyName', 'slug'] },
  { lens: 'diseases', expectedFields: ['id', 'slug', 'displayName'] },
  { lens: 'tickState', expectedFields: ['id', 'tickId', 'stateFips'], emptyOk: true },
  { lens: 'tickCounty', expectedFields: ['id', 'tickId', 'countyFips', 'year', 'status'] },
  {
    lens: 'diseaseCountyYear',
    expectedFields: ['id', 'countyFips', 'diseaseId', 'year', 'count'],
  },
  {
    lens: 'diseaseMonth',
    expectedFields: ['id', 'year', 'month', 'diseaseId', 'count'],
    emptyOk: true,
  },
  // M:N joins
  { lens: 'tickDiseases', expectedFields: ['id', 'tickId', 'diseaseId'] },
  {
    lens: 'tickRemovalTechniques',
    expectedFields: ['id', 'tickId', 'removalTechniqueId'],
    emptyOk: true,
  },
  {
    lens: 'wildFactTicks',
    expectedFields: ['id', 'wildFactId', 'tickId'],
    emptyOk: true,
  },
  {
    lens: 'wildFactDiseases',
    expectedFields: ['id', 'wildFactId', 'diseaseId'],
    emptyOk: true,
  },
  {
    lens: 'wildFactRemovalTechniques',
    expectedFields: ['id', 'wildFactId', 'removalTechniqueId'],
    emptyOk: true,
  },
] as const

interface FeedCheck {
  lens: string
  name: string
  // Some feeds rely on data that may not exist yet, or on indexer state
  // that lags a fresh push. emptyOk skips the "no items" failure but
  // still confirms auth + route shape.
  emptyOk?: boolean
}

const FEED_CHECKS: readonly FeedCheck[] = [
  { lens: 'wildFacts', name: 'latest', emptyOk: true },
  { lens: 'removalTechniques', name: 'latest' },
  { lens: 'tickCounty', name: 'latest' },
  { lens: 'tickCounty', name: 'recentlyEstablished' },
  { lens: 'diseases', name: 'trending' },
  // counties has no change-tracking column (static FIPS data); the feed
  // pulls from the embeddings index and may take time to populate.
  { lens: 'counties', name: 'byDiseaseLoad', emptyOk: true },
  // Recently-pushed lens — recency cursor may lag the bulk-import drop
  // window. Reasserts after a sync cycle.
  { lens: 'diseaseCountyYear', name: 'latest', emptyOk: true },
  { lens: 'diseaseMonth', name: 'latest', emptyOk: true },
] as const

interface AnalyzeRunCheck {
  lens: string
  name: string
  // Default 'pushdown'; analyses that hop a relation via `dim.through`
  // run as 'through'.
  expectedStrategy?: string
  // Source data may be empty for some metrics (e.g. diseaseMonth before
  // monthly imports). emptyOk skips the "no buckets" failure.
  emptyOk?: boolean
}

const ANALYZE_RUN_CHECKS: readonly AnalyzeRunCheck[] = [
  { lens: 'tickDiseases', name: 'diseasesPerTick' },
  { lens: 'tickDiseases', name: 'ticksPerDisease' },
  { lens: 'tickCounty', name: 'establishedRange' },
  // establishedByState + casesByState now run with native pushdown
  // even though the dimension declares `through: 'county'` — the
  // planner pushes the relation hop down into the source query
  // instead of running a service-side traversal. Functionally
  // equivalent; the 'through' label only applies when the planner
  // can't resolve the join at the source.
  { lens: 'tickCounty', name: 'establishedByState' },
  { lens: 'tickCounty', name: 'spreadOverTime' },
  { lens: 'diseaseCountyYear', name: 'casesByYear' },
  { lens: 'diseaseCountyYear', name: 'casesByState' },
  { lens: 'diseaseCountyYear', name: 'countyHotspots' },
  { lens: 'diseaseCountyYear', name: 'densityByH3', expectedStrategy: 'through' },
  { lens: 'diseaseMonth', name: 'seasonality', emptyOk: true },
] as const

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`✗ Missing env var ${name}. Set it in .env or export it before running.`)
    process.exit(2)
  }
  return v
}

interface Failure {
  scope: string
  reason: string
}

async function main() {
  const baseUrl = requireEnv('SEMILAYER_SERVICE_URL')
  const apiKey = requireEnv('NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY')
  if (!apiKey.startsWith('pk_')) {
    console.error(
      `✗ Expected a public key (pk_…) in NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY, got "${apiKey.slice(0, 8)}…"`,
    )
    process.exit(2)
  }

  console.log(`SemiLayer smoke → ${baseUrl}  (key ${apiKey.slice(0, 12)}…)\n`)
  const client = new BeamClient({ baseUrl, apiKey })

  const failures: Failure[] = []

  console.log('-- lenses --')
  for (const check of LENS_CHECKS) {
    const startedAt = Date.now()
    try {
      const [{ count }, { rows }] = await Promise.all([
        client.count(check.lens),
        client.query<Record<string, unknown>>(check.lens, { limit: 2 }),
      ])

      const tookMs = Date.now() - startedAt

      if (rows.length === 0) {
        if (check.emptyOk) {
          console.log(
            `  ${pad(check.lens)}  count=${count}  ${tookMs}ms  (empty — ok for this lens)`,
          )
          continue
        }
        failures.push({ scope: `lens:${check.lens}`, reason: `no rows returned (count=${count})` })
        console.log(`✗ ${pad(check.lens)}  count=${count}  ${tookMs}ms  no rows`)
        continue
      }

      const sample = rows[0] ?? {}
      const missing = check.expectedFields.filter((f) => !(f in sample))
      if (missing.length > 0) {
        failures.push({
          scope: `lens:${check.lens}`,
          reason: `missing fields: ${missing.join(', ')}. got: ${Object.keys(sample).join(', ')}`,
        })
        console.log(`✗ ${pad(check.lens)}  missing ${missing.join(', ')}`)
        continue
      }

      console.log(
        `  ${pad(check.lens)}  count=${count}  ${tookMs}ms  fields=[${check.expectedFields.join(',')}]`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failures.push({ scope: `lens:${check.lens}`, reason: msg })
      console.log(`✗ ${pad(check.lens)}  ${msg}`)
    }
  }

  console.log('\n-- feeds --')
  for (const check of FEED_CHECKS) {
    const label = `${check.lens}.${check.name}`
    const startedAt = Date.now()
    try {
      const page = await client.feed(check.lens, check.name, { pageSize: 2 })
      const tookMs = Date.now() - startedAt

      if (page.items.length === 0 && !check.emptyOk) {
        failures.push({ scope: `feed:${label}`, reason: 'no items returned' })
        console.log(`✗ ${pad(label)}  ${tookMs}ms  empty`)
        continue
      }
      const note = page.items.length === 0 ? '  (empty — ok for this feed)' : ''
      console.log(`  ${pad(label)}  items=${page.items.length}  ${tookMs}ms${note}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failures.push({ scope: `feed:${label}`, reason: msg })
      console.log(`✗ ${pad(label)}  ${msg}`)
    }
  }

  console.log('\n-- analyses --')
  for (const check of ANALYZE_RUN_CHECKS) {
    const label = `${check.lens}.${check.name}`
    const expectedStrategy = check.expectedStrategy ?? 'pushdown'
    const startedAt = Date.now()
    try {
      const result = await client.analyze(check.lens, check.name)
      const tookMs = Date.now() - startedAt

      if (result.kind !== 'metric') {
        failures.push({
          scope: `analyze:${label}`,
          reason: `expected kind 'metric', got '${result.kind}'`,
        })
        console.log(`✗ ${pad(label)}  unexpected kind=${result.kind}`)
        continue
      }
      const strategy = result.meta.strategy
      if (strategy !== expectedStrategy) {
        failures.push({
          scope: `analyze:${label}`,
          reason: `expected meta.strategy '${expectedStrategy}', got '${strategy}' (silent fallback?)`,
        })
        console.log(`✗ ${pad(label)}  strategy=${strategy} (expected ${expectedStrategy})`)
        continue
      }
      if (result.buckets.length === 0 && !check.emptyOk) {
        failures.push({ scope: `analyze:${label}`, reason: 'no buckets returned' })
        console.log(`✗ ${pad(label)}  ${tookMs}ms  empty`)
        continue
      }
      const note = result.buckets.length === 0 ? '  (empty — ok for this metric)' : ''
      console.log(
        `  ${pad(label)}  buckets=${result.buckets.length}  ${tookMs}ms  strategy=${strategy}${note}`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failures.push({ scope: `analyze:${label}`, reason: msg })
      console.log(`✗ ${pad(label)}  ${msg}`)
    }
  }

  const total = LENS_CHECKS.length + FEED_CHECKS.length + ANALYZE_RUN_CHECKS.length
  console.log('')
  if (failures.length > 0) {
    console.error(`✗ ${failures.length} checks failed (out of ${total})`)
    for (const f of failures) console.error(`  - ${f.scope}: ${f.reason}`)
    process.exit(1)
  }

  console.log(`✓ all ${total} checks healthy`)
}

function pad(s: string): string {
  return s.padEnd(34, ' ')
}

main().catch((err) => {
  console.error('✗ unexpected error:', err)
  process.exit(1)
})
