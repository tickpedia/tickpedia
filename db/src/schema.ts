// Tickpedia schema. Lives outside apps/ so the public site, admin, scrape
// jobs, and tests all read from the same source of truth.
//
// Geography model: US → State → County.
//
//   states         keyed by 2-char FIPS ('25'); slug = lowercase USPS code ('ma')
//   counties       keyed by 5-char FIPS ('25009'); slug strips ' County',
//                  ' Borough', etc. and is unique within a state
//
// URL shape (when routes get drawn):
//   /us/<state-slug>                e.g. /us/ma
//   /us/<state-slug>/<county-slug>  e.g. /us/ma/essex
//
// Surveillance counts (CDC) live in disease_county_year + disease_month.
// Editorial tick prevalence lives in tick_state.

import { sql } from 'drizzle-orm'
import { pgTable, serial, text, integer, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core'

export const dangerLevel = pgEnum('danger_level', ['low', 'medium', 'high'])
export const prevalence = pgEnum('prevalence', ['low', 'medium', 'high'])

// ─── Ticks ────────────────────────────────────────────────────────────

export const ticks = pgTable(
  'ticks',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull(),
    commonName: text('common_name').notNull(),
    scientificName: text('scientific_name').notNull(),
    heroPhotoUrl: text('hero_photo_url'),
    dangerLevel: dangerLevel('danger_level').notNull().default('low'),
    diseases: text('diseases')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('ticks_slug_idx').on(t.slug),
  }),
)

// ─── Geography ────────────────────────────────────────────────────────

export const states = pgTable(
  'states',
  {
    fips: text('fips').primaryKey(), // '25'
    code: text('code').notNull(), // 'MA' (USPS, uppercase)
    slug: text('slug').notNull(), // 'ma' (lowercase USPS — URL form)
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
  },
  (t) => ({
    // Slugs are unique *within a state*. Adams County exists in many.
    stateSlugIdx: uniqueIndex('counties_state_slug_idx').on(t.stateFips, t.slug),
  }),
)

// ─── Tick × State (editorial prevalence + peak months) ────────────────

// Surrogate id is here because SemiLayer lenses require exactly one
// primary-key field — composite PKs aren't supported. The natural key
// `(tick_id, state_fips)` is enforced as a unique index.
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
  },
  (t) => ({
    naturalKey: uniqueIndex('tick_state_natural_idx').on(t.tickId, t.stateFips),
  }),
)

// ─── Editorial content ────────────────────────────────────────────────

export const removalTechniques = pgTable(
  'removal_techniques',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    steps: text('steps').notNull(),
    sourceUrl: text('source_url'),
  },
  (t) => ({
    slugIdx: uniqueIndex('removal_techniques_slug_idx').on(t.slug),
  }),
)

export const wildFacts = pgTable('wild_facts', {
  id: serial('id').primaryKey(),
  body: text('body').notNull(),
  citationUrl: text('citation_url'),
  tickId: integer('tick_id').references(() => ticks.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

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
    aliases: text('aliases')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
  },
  (t) => ({
    naturalKey: uniqueIndex('disease_county_year_natural_idx').on(
      t.countyFips,
      t.diseaseId,
      t.year,
    ),
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
  },
  (t) => ({
    naturalKey: uniqueIndex('disease_month_natural_idx').on(t.year, t.month, t.diseaseId),
  }),
)
