// Smoke test for the SemiLayer config: hit every queryable lens with
// the public read key (`pk_…`), confirm we get rows in the expected
// shape, and exit non-zero on any failure.
//
// Run me after `pnpm semilayer:push` / `pnpm semilayer:generate` to
// verify the live tenant matches the local config.
//
//   pnpm semilayer:smoke
//
// Required env (loaded from the repo-root .env via tsx --env-file):
//   SEMILAYER_SERVICE_URL          e.g. https://api.semilayer.com
//   NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY   pk_prod_…
//
// We deliberately use the public key, not the service key, so this
// exercises the same access path the public site does. We also use the
// raw BeamClient (not the generated typed Beam) so this smoke stays
// independent of `pnpm semilayer:generate` having run.

import { BeamClient } from '@semilayer/client'

interface Check {
  lens: string
  expectedFields: readonly string[]
  // A lens may legitimately be empty (e.g. tickState before editorial
  // rows are added). emptyOk = true silences "no rows returned" while
  // still verifying the route + auth work.
  emptyOk?: boolean
}

const CHECKS: readonly Check[] = [
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

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`✗ Missing env var ${name}. Set it in .env or export it before running.`)
    process.exit(2)
  }
  return v
}

interface Failure {
  lens: string
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
  for (const check of CHECKS) {
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
        failures.push({ lens: check.lens, reason: `no rows returned (count=${count})` })
        console.log(`✗ ${pad(check.lens)}  count=${count}  ${tookMs}ms  no rows`)
        continue
      }

      const sample = rows[0] ?? {}
      const missing = check.expectedFields.filter((f) => !(f in sample))
      if (missing.length > 0) {
        failures.push({
          lens: check.lens,
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
      failures.push({ lens: check.lens, reason: msg })
      console.log(`✗ ${pad(check.lens)}  ${msg}`)
    }
  }

  console.log('')
  if (failures.length > 0) {
    console.error(`✗ ${failures.length} / ${CHECKS.length} lenses failed`)
    for (const f of failures) console.error(`  - ${f.lens}: ${f.reason}`)
    process.exit(1)
  }

  console.log(`✓ all ${CHECKS.length} lenses healthy`)
}

function pad(s: string): string {
  return s.padEnd(22, ' ')
}

main().catch((err) => {
  console.error('✗ unexpected error:', err)
  process.exit(1)
})
