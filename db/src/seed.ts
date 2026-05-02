// Tiny seed for local dev. Run after `db:migrate`.
// Run: pnpm --filter @tickpedia/db db:seed
//
// Order matters because of FKs:
//   1. states     ← parsed from db/src/seeds/data/fips.txt
//   2. counties   ← same source; FK on states.fips
//   3. diseases   ← canonical CDC list
//   4. ticks      ← canonical species list
//   5. removal_techniques ← editorial canonical list
//   6. tick_state ← editorial sample (Massachusetts, scapularis)
//   7. wild_facts ← editorial sample fact
//
// Idempotent: every insert uses ON CONFLICT DO NOTHING / DO UPDATE so
// re-running the seed won't error. Surveillance counts (disease_county_year
// / disease_month / tick_county) are not seeded here — those flow in via
// the admin panel xlsx import or scheduled scrape jobs.

import { sql } from 'drizzle-orm'
import { connect } from './connect.js'
import {
  ticks,
  tickState,
  tickDiseases,
  wildFacts,
  wildFactTicks,
  states,
  counties,
  diseases,
  removalTechniques,
} from './schema.js'
import { loadLocations } from './seeds/locations/index.js'
import { CANONICAL_DISEASES } from './seeds/diseases.js'
import { CANONICAL_TICKS } from './seeds/ticks.js'
import { CANONICAL_REMOVAL_TECHNIQUES } from './seeds/removal-techniques.js'

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
  .onConflictDoUpdate({
    target: diseases.slug,
    set: {
      displayName: sql`EXCLUDED.display_name`,
      aliases: sql`EXCLUDED.aliases`,
      updatedAt: sql`now()`,
    },
  })
console.log(`diseases: ${CANONICAL_DISEASES.length} rows`)

// ─── 3. Canonical ticks ───────────────────────────────────────────────
await db
  .insert(ticks)
  .values(
    CANONICAL_TICKS.map((t) => ({
      slug: t.slug,
      commonName: t.commonName,
      scientificName: t.scientificName,
      dangerLevel: t.dangerLevel,
    })),
  )
  .onConflictDoUpdate({
    target: ticks.slug,
    set: {
      commonName: sql`EXCLUDED.common_name`,
      scientificName: sql`EXCLUDED.scientific_name`,
      dangerLevel: sql`EXCLUDED.danger_level`,
      updatedAt: sql`now()`,
    },
  })
console.log(`ticks: ${CANONICAL_TICKS.length} rows`)

// ─── 3b. tick_diseases — resolve canonical tick.diseases (display names)
//        against the diseases table and write the join rows. Idempotent
//        via the (tick_id, disease_id) unique index.
const tickIdRows = await db
  .select({ id: ticks.id, slug: ticks.slug })
  .from(ticks)
const tickIdBySlug = new Map(tickIdRows.map((r) => [r.slug, r.id]))
const diseaseIdRows = await db
  .select({ id: diseases.id, displayName: diseases.displayName })
  .from(diseases)
const diseaseIdByName = new Map(
  diseaseIdRows.map((r) => [r.displayName.toLowerCase(), r.id]),
)
const tickDiseaseRows: { tickId: number; diseaseId: number }[] = []
for (const t of CANONICAL_TICKS) {
  const tickId = tickIdBySlug.get(t.slug)
  if (!tickId) continue
  for (const dn of t.diseases) {
    const did = diseaseIdByName.get(dn.toLowerCase())
    if (did) tickDiseaseRows.push({ tickId, diseaseId: did })
  }
}
if (tickDiseaseRows.length > 0) {
  await db
    .insert(tickDiseases)
    .values(tickDiseaseRows)
    .onConflictDoNothing()
}
console.log(`tick_diseases: ${tickDiseaseRows.length} rows`)

// ─── 4. Removal techniques ────────────────────────────────────────────
await db
  .insert(removalTechniques)
  .values(CANONICAL_REMOVAL_TECHNIQUES)
  .onConflictDoUpdate({
    target: removalTechniques.slug,
    set: {
      title: sql`EXCLUDED.title`,
      steps: sql`EXCLUDED.steps`,
      sourceUrl: sql`EXCLUDED.source_url`,
      updatedAt: sql`now()`,
    },
  })
console.log(`removal_techniques: ${CANONICAL_REMOVAL_TECHNIQUES.length} rows`)

// ─── 5. Editorial sample (state-level prevalence + a fact) ────────────
const [deer] = await db
  .select({ id: ticks.id })
  .from(ticks)
  .where(sql`${ticks.slug} = 'ixodes-scapularis'`)
  .limit(1)

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

  // Wild fact — slug-based idempotency now (replaces the old body-match).
  const seedFactSlug = 'nymph-poppy-seed-borrelia'
  const seedFactBody =
    'A single nymph the size of a poppy seed can deliver Borrelia burgdorferi ' +
    'in under 36 hours of attachment.'

  await db
    .insert(wildFacts)
    .values({ slug: seedFactSlug, body: seedFactBody })
    .onConflictDoNothing({ target: wildFacts.slug })

  const [factRow] = await db
    .select({ id: wildFacts.id })
    .from(wildFacts)
    .where(sql`${wildFacts.slug} = ${seedFactSlug}`)
    .limit(1)
  if (factRow?.id) {
    await db
      .insert(wildFactTicks)
      .values({ wildFactId: factRow.id, tickId: deer.id })
      .onConflictDoNothing()
  }
}

console.log('seeded')
