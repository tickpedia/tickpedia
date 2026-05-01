// Tiny seed for local dev. Run after `db:migrate`.
// Run: pnpm --filter @tickpedia/db db:seed
//
// Order matters because of FKs:
//   1. states     ← parsed from db/src/seeds/data/fips.txt
//   2. counties   ← same source; FK on states.fips
//   3. diseases   ← canonical CDC list
//   4. ticks + tick_state + wild_facts ← editorial sample
//
// Idempotent: every insert uses ON CONFLICT DO NOTHING / DO UPDATE so
// re-running the seed won't error. Surveillance counts (disease_county_year
// / disease_month) are not seeded here — those flow in via the CDC ingest
// pipeline.

import { connect } from './connect.js'
import { ticks, tickState, wildFacts, states, counties, diseases } from './schema.js'
import { loadLocations } from './seeds/locations/index.js'
import { CANONICAL_DISEASES } from './seeds/diseases.js'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const db = connect(url)

// ─── 1. States + counties (from FCC FIPS file) ────────────────────────
const { states: seedStates, counties: seedCounties } = loadLocations()

if (seedStates.length > 0) {
  await db.insert(states).values(seedStates).onConflictDoNothing({ target: states.fips })
}
console.log(`states: ${seedStates.length} rows`)

// Counties is ~3,000 rows — chunk to keep the SQL statement size sane.
const CHUNK = 500
for (let i = 0; i < seedCounties.length; i += CHUNK) {
  const chunk = seedCounties.slice(i, i + CHUNK)
  await db.insert(counties).values(chunk).onConflictDoNothing({ target: counties.fips })
}
console.log(`counties: ${seedCounties.length} rows`)

// ─── 2. Canonical diseases ────────────────────────────────────────────
await db
  .insert(diseases)
  .values(
    CANONICAL_DISEASES.map((d) => ({
      slug: d.slug,
      displayName: d.displayName,
      aliases: d.aliases,
    })),
  )
  .onConflictDoNothing({ target: diseases.slug })
console.log(`diseases: ${CANONICAL_DISEASES.length} rows`)

// ─── 3. Editorial sample (ticks + state-level prevalence + a fact) ────
const [deer] = await db
  .insert(ticks)
  .values({
    slug: 'ixodes-scapularis',
    commonName: 'Black-legged tick',
    scientificName: 'Ixodes scapularis',
    dangerLevel: 'high',
    diseases: ['Lyme disease', 'Babesiosis', 'Anaplasmosis'],
  })
  .onConflictDoNothing({ target: ticks.slug })
  .returning()

if (deer) {
  await db
    .insert(tickState)
    .values({
      tickId: deer.id,
      stateFips: '25', // Massachusetts
      prevalence: 'high',
      peakMonths: [5, 6, 7],
    })
    .onConflictDoNothing()

  await db
    .insert(wildFacts)
    .values({
      body:
        'A single nymph the size of a poppy seed can deliver Borrelia burgdorferi ' +
        'in under 36 hours of attachment.',
      tickId: deer.id,
    })
    .onConflictDoNothing()
}

console.log('seeded')
