// Tickpedia schema. Lives outside apps/ so the public site, admin, scrape
// jobs, and tests all read from the same source of truth.
//
// Geography model: US → State → County.
//
//   states         keyed by 2-char FIPS ('25'); slug = full name slugified
//                  ('massachusetts', 'north-carolina', 'district-of-columbia') —
//                  USPS-code aliases (`/states/ma`) redirect via aliases.ts
//   counties       keyed by 5-char FIPS ('25009'); slug strips ' County',
//                  ' Borough', etc. and is unique within a state
//
// URL shape:
//   /states/<state-slug>                       e.g. /states/massachusetts
//   /counties/<state-slug>/<county-slug>       e.g. /counties/massachusetts/essex
//
// Surveillance counts (CDC) live in disease_county_year + disease_month.
// Tick presence by county lives in tick_county (CDC ArboNET-style).
// Editorial tick prevalence by state lives in tick_state.
//
// Every table that downstream consumers (SemiLayer change tracking, the
// admin "what's new" view) need to slice by recency carries a `created_at`
// and `updated_at` timestamp. Bulk ingest pipelines bump `updated_at`
// on conflict so re-imports surface as fresh rows even when values are
// stable.

import { sql } from 'drizzle-orm'
import { pgTable, serial, text, integer, doublePrecision, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core'

export const dangerLevel = pgEnum('danger_level', ['low', 'medium', 'high'])
export const prevalence = pgEnum('prevalence', ['low', 'medium', 'high'])
export const tickStatus = pgEnum('tick_status', ['established', 'reported', 'no_records'])
// CDC's Ixodes Pathogens County Table only ever publishes "Present" or
// "No records". Cumulative — once a pathogen flips to present in a
// county it stays present in subsequent vintages.
export const pathogenStatus = pgEnum('pathogen_status', ['present', 'no_records'])

// ─── Ticks ────────────────────────────────────────────────────────────

export const ticks = pgTable(
  'ticks',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull(),
    commonName: text('common_name').notNull(),
    scientificName: text('scientific_name').notNull(),
    // SEO meta description + page subtitle. ≤155 chars by editorial
    // contract; 200 hard cap enforced at the import boundary. Nullable
    // so existing rows stay valid before the JSON re-import populates.
    oneLiner: text('one_liner'),
    heroPhotoUrl: text('hero_photo_url'),
    // Hero art parameters. Admin picks colors; the public site renders
    // the SVG from these. Nullable so existing rows stay valid until an
    // admin opens the editor.
    heroHeadColor: text('hero_head_color'),
    heroBodyColor: text('hero_body_color'),
    heroLegColor: text('hero_leg_color'),
    dangerLevel: dangerLevel('danger_level').notNull().default('low'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('ticks_slug_idx').on(t.slug),
    scientificIdx: uniqueIndex('ticks_scientific_idx').on(t.scientificName),
  }),
)

// ─── Geography ────────────────────────────────────────────────────────

export const states = pgTable(
  'states',
  {
    fips: text('fips').primaryKey(), // '25'
    code: text('code').notNull(), // 'MA' (USPS, uppercase — alias only)
    slug: text('slug').notNull(), // 'massachusetts' (full name slugified — URL canonical)
    name: text('name').notNull(), // 'Massachusetts'
  },
  (t) => ({
    codeIdx: uniqueIndex('states_code_idx').on(t.code),
    slugIdx: uniqueIndex('states_slug_idx').on(t.slug),
  }),
)

export const counties = pgTable(
  'counties',
  {
    fips: text('fips').primaryKey(), // '25009' — keep the leading zero
    stateFips: text('state_fips')
      .notNull()
      .references(() => states.fips, { onDelete: 'cascade' }),
    countyName: text('county_name').notNull(), // 'Essex County' / 'Baltimore city'
    slug: text('slug').notNull(), // 'essex' / 'baltimore-city'
    // Internal-point centroid from the Census Gazetteer. Lets the read
    // layer bucket county-keyed facts into H3 / geohash cells for
    // border-agnostic heatmaps.
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
  },
  (t) => ({
    // Slugs are unique *within a state*. Adams County exists in many.
    stateSlugIdx: uniqueIndex('counties_state_slug_idx').on(t.stateFips, t.slug),
  }),
)

// ─── Tick × State (editorial prevalence + peak months) ────────────────

// Surrogate `id` keeps this table on the same single-PK shape as the
// rest of the schema; the natural key `(tick_id, state_fips)` is
// enforced as a unique index so upserts in the admin / ingest paths
// stay idempotent.
export const tickState = pgTable(
  'tick_state',
  {
    id: serial('id').primaryKey(),
    tickId: integer('tick_id')
      .notNull()
      .references(() => ticks.id, { onDelete: 'cascade' }),
    stateFips: text('state_fips')
      .notNull()
      .references(() => states.fips, { onDelete: 'cascade' }),
    prevalence: prevalence('prevalence').notNull().default('low'),
    peakMonths: integer('peak_months')
      .array()
      .notNull()
      .default(sql`ARRAY[]::integer[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex('tick_state_natural_idx').on(t.tickId, t.stateFips),
  }),
)

// ─── Tick × County (ArboNET-style surveillance presence) ──────────────
//
// Each row asserts: as of `year`, in this county, this tick was at
// status (established / reported / no_records). `source` and
// `sourceComments` carry the citation as it appeared in the input file.
//
// Natural key (tick_id, county_fips, year) is unique — re-importing the
// same year overwrites; importing a new year inserts.
export const tickCounty = pgTable(
  'tick_county',
  {
    id: serial('id').primaryKey(),
    tickId: integer('tick_id')
      .notNull()
      .references(() => ticks.id, { onDelete: 'cascade' }),
    countyFips: text('county_fips')
      .notNull()
      .references(() => counties.fips, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    status: tickStatus('status').notNull().default('no_records'),
    source: text('source'),
    sourceComments: text('source_comments'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex('tick_county_natural_idx').on(t.tickId, t.countyFips, t.year),
  }),
)

// ─── Editorial content ────────────────────────────────────────────────

export const removalTechniques = pgTable(
  'removal_techniques',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    oneLiner: text('one_liner'),
    steps: text('steps').notNull(),
    sourceUrl: text('source_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('removal_techniques_slug_idx').on(t.slug),
  }),
)

export const wildFacts = pgTable(
  'wild_facts',
  {
    id: serial('id').primaryKey(),
    // Stable handle for idempotent JSON imports. Optional in the admin
    // editor (auto-derived from the body if blank), required for any
    // re-import path so re-running the same JSON updates instead of
    // duplicating.
    slug: text('slug').notNull(),
    body: text('body').notNull(),
    citationUrl: text('citation_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('wild_facts_slug_idx').on(t.slug),
  }),
)

// ─── Editorial M:N joins ─────────────────────────────────────────────
//
// Each editorial entity can attach to several ticks (and vice versa);
// wild facts can also attach to diseases and removal techniques. We
// keep all five joins flat with a surrogate `id` so SemiLayer can lens
// them with a single PK and chain the include from either side.

export const tickDiseases = pgTable(
  'tick_diseases',
  {
    id: serial('id').primaryKey(),
    tickId: integer('tick_id')
      .notNull()
      .references(() => ticks.id, { onDelete: 'cascade' }),
    diseaseId: integer('disease_id')
      .notNull()
      .references(() => diseases.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex('tick_diseases_natural_idx').on(t.tickId, t.diseaseId),
  }),
)

export const tickRemovalTechniques = pgTable(
  'tick_removal_techniques',
  {
    id: serial('id').primaryKey(),
    tickId: integer('tick_id')
      .notNull()
      .references(() => ticks.id, { onDelete: 'cascade' }),
    removalTechniqueId: integer('removal_technique_id')
      .notNull()
      .references(() => removalTechniques.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex('tick_removal_techniques_natural_idx').on(
      t.tickId,
      t.removalTechniqueId,
    ),
  }),
)

export const wildFactTicks = pgTable(
  'wild_fact_ticks',
  {
    id: serial('id').primaryKey(),
    wildFactId: integer('wild_fact_id')
      .notNull()
      .references(() => wildFacts.id, { onDelete: 'cascade' }),
    tickId: integer('tick_id')
      .notNull()
      .references(() => ticks.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex('wild_fact_ticks_natural_idx').on(t.wildFactId, t.tickId),
  }),
)

export const wildFactDiseases = pgTable(
  'wild_fact_diseases',
  {
    id: serial('id').primaryKey(),
    wildFactId: integer('wild_fact_id')
      .notNull()
      .references(() => wildFacts.id, { onDelete: 'cascade' }),
    diseaseId: integer('disease_id')
      .notNull()
      .references(() => diseases.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex('wild_fact_diseases_natural_idx').on(t.wildFactId, t.diseaseId),
  }),
)

export const wildFactRemovalTechniques = pgTable(
  'wild_fact_removal_techniques',
  {
    id: serial('id').primaryKey(),
    wildFactId: integer('wild_fact_id')
      .notNull()
      .references(() => wildFacts.id, { onDelete: 'cascade' }),
    removalTechniqueId: integer('removal_technique_id')
      .notNull()
      .references(() => removalTechniques.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex('wild_fact_removal_techniques_natural_idx').on(
      t.wildFactId,
      t.removalTechniqueId,
    ),
  }),
)

// ─── Scientific surveillance data ─────────────────────────────────────
//
// Source: CDC tick-borne disease surveillance.
//   https://www.cdc.gov/ticks/data-research/facts-stats/index.html
//
// Two shapes ship from CDC and similar agencies:
//   1. Monthly national counts        → diseaseMonth
//   2. Annual per-county counts (FIPS) → diseaseCountyYear
//
// Disease names in raw inputs are inconsistent. We store one canonical
// row per disease in `diseases` with a slug + a list of accepted
// aliases; ingest normalizes loose strings to a slug and resolves to
// disease_id via `WHERE slug = $1 OR $1 = ANY(aliases)`.

export const diseases = pgTable(
  'diseases',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull(),
    displayName: text('display_name').notNull(),
    // Same SEO contract as ticks + removalTechniques: ≤155 chars by
    // editorial guideline, 200 hard cap at the import boundary.
    // Nullable so existing rows stay valid until the JSON re-import
    // populates.
    oneLiner: text('one_liner'),
    aliases: text('aliases')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('diseases_slug_idx').on(t.slug),
  }),
)

export const diseaseCountyYear = pgTable(
  'disease_county_year',
  {
    id: serial('id').primaryKey(),
    countyFips: text('county_fips')
      .notNull()
      .references(() => counties.fips, { onDelete: 'cascade' }),
    diseaseId: integer('disease_id')
      .notNull()
      .references(() => diseases.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    count: integer('count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex('disease_county_year_natural_idx').on(
      t.countyFips,
      t.diseaseId,
      t.year,
    ),
  }),
)

// ─── Pathogens (Ixodes-borne; future-extensible to other genera) ──────
//
// CDC's "Public Use Ixodes Pathogens County Table" reports per-county
// presence for ~7 pathogens (Borrelia burgdorferi, B. mayonii, B.
// miyamotoi, Anaplasma phagocytophilum, Ehrlichia muris eauclairensis,
// Babesia microti, Powassan virus). We keep them in their own table
// rather than collapsing into `diseases` because the relationship is
// many-to-many (one pathogen may cause several human diseases; one
// disease may be caused by several pathogens) and the CDC surveillance
// granularity differs (pathogen presence in ticks vs. case counts in
// humans).
export const pathogens = pgTable(
  'pathogens',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull(),
    displayName: text('display_name').notNull(),
    scientificName: text('scientific_name').notNull(),
    // Same SEO contract as ticks/diseases: ≤155 chars editorial guideline,
    // 200 hard cap at the import boundary. Nullable so seed rows stay
    // valid before the editorial copy lands.
    oneLiner: text('one_liner'),
    aliases: text('aliases')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('pathogens_slug_idx').on(t.slug),
    scientificIdx: uniqueIndex('pathogens_scientific_idx').on(t.scientificName),
  }),
)

// ─── Pathogen × Tick (which ticks carry which pathogens) ────────────
//
// CDC's Ixodes Pathogens table only ever covers blacklegged + western
// blacklegged. Other tick × pathogen pairs (e.g. Powassan via Ixodes
// cookei) get added editorially through the JSON content path. Same
// shape as `tick_diseases` — surrogate id, natural key on the pair.
export const tickPathogens = pgTable(
  'tick_pathogens',
  {
    id: serial('id').primaryKey(),
    tickId: integer('tick_id')
      .notNull()
      .references(() => ticks.id, { onDelete: 'cascade' }),
    pathogenId: integer('pathogen_id')
      .notNull()
      .references(() => pathogens.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex('tick_pathogens_natural_idx').on(t.tickId, t.pathogenId),
  }),
)

// ─── Pathogen × Disease (which pathogens cause which diseases) ──────
//
// Many-to-many: Lyme is caused by both B. burgdorferi and B. mayonii;
// B. burgdorferi causes only Lyme. Lets a disease page surface
// "tested positive in N counties" by joining
// disease → diseasePathogens → pathogens → pathogenCounty.
export const diseasePathogens = pgTable(
  'disease_pathogens',
  {
    id: serial('id').primaryKey(),
    diseaseId: integer('disease_id')
      .notNull()
      .references(() => diseases.id, { onDelete: 'cascade' }),
    pathogenId: integer('pathogen_id')
      .notNull()
      .references(() => pathogens.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex('disease_pathogens_natural_idx').on(t.diseaseId, t.pathogenId),
  }),
)

export const pathogenCounty = pgTable(
  'pathogen_county',
  {
    id: serial('id').primaryKey(),
    pathogenId: integer('pathogen_id')
      .notNull()
      .references(() => pathogens.id, { onDelete: 'cascade' }),
    countyFips: text('county_fips')
      .notNull()
      .references(() => counties.fips, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    status: pathogenStatus('status').notNull().default('no_records'),
    source: text('source'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex('pathogen_county_natural_idx').on(t.pathogenId, t.countyFips, t.year),
  }),
)

export const diseaseMonth = pgTable(
  'disease_month',
  {
    id: serial('id').primaryKey(),
    year: integer('year').notNull(),
    month: integer('month').notNull(), // 1–12
    diseaseId: integer('disease_id')
      .notNull()
      .references(() => diseases.id, { onDelete: 'cascade' }),
    count: integer('count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    naturalKey: uniqueIndex('disease_month_natural_idx').on(t.year, t.month, t.diseaseId),
  }),
)
