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
  tickPathogens,
  diseasePathogens,
  wildFacts,
  wildFactTicks,
  states,
  counties,
  diseases,
  pathogens,
  removalTechniques,
} from './schema.js'
import { loadLocations } from './seeds/locations/index.js'
import { CANONICAL_DISEASES } from './seeds/diseases.js'
import { CANONICAL_TICKS } from './seeds/ticks.js'
import { CANONICAL_PATHOGENS } from './seeds/pathogens.js'
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
  // Upsert (not DoNothing) so a slug rule change re-seeds cleanly
  // without manual intervention.
  await db
    .insert(states)
    .values(seedStates)
    .onConflictDoUpdate({
      target: states.fips,
      set: {
        code: sql`EXCLUDED.code`,
        slug: sql`EXCLUDED.slug`,
        name: sql`EXCLUDED.name`,
      },
    })
}
console.log(`states: ${seedStates.length} rows`)

// Counties is ~3,000 rows — chunk to keep the SQL statement size sane.
// Upsert (not DoNothing) so re-seeding fills in centroid lat/lon on
// rows that pre-date the geo column.
const CHUNK = 500
for (let i = 0; i < seedCounties.length; i += CHUNK) {
  const chunk = seedCounties.slice(i, i + CHUNK)
  await db
    .insert(counties)
    .values(chunk)
    .onConflictDoUpdate({
      target: counties.fips,
      set: {
        stateFips: sql`EXCLUDED.state_fips`,
        countyName: sql`EXCLUDED.county_name`,
        slug: sql`EXCLUDED.slug`,
        latitude: sql`EXCLUDED.latitude`,
        longitude: sql`EXCLUDED.longitude`,
      },
    })
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
    // Conflict on scientificName (also unique) so a slug rename
    // updates the existing row instead of inserting a duplicate.
    target: ticks.scientificName,
    set: {
      slug: sql`EXCLUDED.slug`,
      commonName: sql`EXCLUDED.common_name`,
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

// ─── 3c. Canonical pathogens (Ixodes-borne) ───────────────────────────
await db
  .insert(pathogens)
  .values(
    CANONICAL_PATHOGENS.map((p) => ({
      slug: p.slug,
      displayName: p.displayName,
      scientificName: p.scientificName,
      oneLiner: p.oneLiner,
      aliases: p.aliases,
    })),
  )
  .onConflictDoUpdate({
    target: pathogens.scientificName,
    set: {
      slug: sql`EXCLUDED.slug`,
      displayName: sql`EXCLUDED.display_name`,
      oneLiner: sql`EXCLUDED.one_liner`,
      aliases: sql`EXCLUDED.aliases`,
      updatedAt: sql`now()`,
    },
  })
console.log(`pathogens: ${CANONICAL_PATHOGENS.length} rows`)

// ─── 3d. Pathogen ↔ Tick + Pathogen ↔ Disease join rows ──────────────
//
// Resilient lookup: a pathogen's `diseases[]` may reference disease
// slugs that only exist after the JSON content import (e.g.
// `borrelia-miyamotoi-disease`). Missing slugs are silently skipped;
// re-running this seed after the JSON content import lands picks up
// the deferred rows. Resolve by slug + each disease's aliases so
// editorial alias additions don't break the join.
{
  const pathogenIdRows = await db
    .select({ id: pathogens.id, slug: pathogens.slug })
    .from(pathogens)
  const pathogenIdBySlug = new Map(pathogenIdRows.map((r) => [r.slug, r.id]))

  const allTicks = await db.select({ id: ticks.id, slug: ticks.slug }).from(ticks)
  const tickIdBySlugForJoin = new Map(allTicks.map((t) => [t.slug, t.id]))

  const allDiseases = await db
    .select({ id: diseases.id, slug: diseases.slug, aliases: diseases.aliases })
    .from(diseases)
  const diseaseIdBySlugOrAlias = new Map<string, number>()
  for (const d of allDiseases) {
    diseaseIdBySlugOrAlias.set(d.slug, d.id)
    for (const a of d.aliases) diseaseIdBySlugOrAlias.set(a, d.id)
  }

  const tickPathogenRows: { tickId: number; pathogenId: number }[] = []
  const diseasePathogenRows: { diseaseId: number; pathogenId: number }[] = []
  let missing = 0
  for (const p of CANONICAL_PATHOGENS) {
    const pid = pathogenIdBySlug.get(p.slug)
    if (!pid) continue
    for (const tickSlug of p.ticks) {
      const tid = tickIdBySlugForJoin.get(tickSlug)
      if (tid) tickPathogenRows.push({ tickId: tid, pathogenId: pid })
      else missing++
    }
    for (const diseaseSlug of p.diseases) {
      const did = diseaseIdBySlugOrAlias.get(diseaseSlug)
      if (did) diseasePathogenRows.push({ diseaseId: did, pathogenId: pid })
      else missing++
    }
  }
  if (tickPathogenRows.length > 0) {
    await db.insert(tickPathogens).values(tickPathogenRows).onConflictDoNothing()
  }
  if (diseasePathogenRows.length > 0) {
    await db.insert(diseasePathogens).values(diseasePathogenRows).onConflictDoNothing()
  }
  console.log(
    `tick_pathogens: ${tickPathogenRows.length} rows; disease_pathogens: ${diseasePathogenRows.length} rows` +
      (missing > 0 ? ` (${missing} refs deferred — slug not in DB yet)` : ''),
  )
}

// ─── 4. Removal techniques ────────────────────────────────────────────
await db
  .insert(removalTechniques)
  .values(CANONICAL_REMOVAL_TECHNIQUES)
  .onConflictDoUpdate({
    target: removalTechniques.slug,
    set: {
      title: sql`EXCLUDED.title`,
      oneLiner: sql`EXCLUDED.one_liner`,
      steps: sql`EXCLUDED.steps`,
      sourceUrl: sql`EXCLUDED.source_url`,
      kind: sql`EXCLUDED.kind`,
      preventionScore: sql`EXCLUDED.prevention_score`,
      citations: sql`EXCLUDED.citations`,
      updatedAt: sql`now()`,
    },
  })
console.log(`removal_techniques: ${CANONICAL_REMOVAL_TECHNIQUES.length} rows`)

// ─── 5. Editorial sample (state-level prevalence + a fact) ────────────
const [deer] = await db
  .select({ id: ticks.id })
  .from(ticks)
  .where(sql`${ticks.slug} = 'blacklegged-tick'`)
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
