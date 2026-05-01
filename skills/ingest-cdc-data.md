# Skill: ingest-cdc-data

Pull CDC tick-borne disease surveillance data into the DB.

Source: https://www.cdc.gov/ticks/data-research/facts-stats/index.html

## Two shapes

CDC ships in two shapes — both already have tables.

| Shape | Columns | Table |
|---|---|---|
| Monthly national | year, month, disease, count | `disease_month` |
| Annual per-county | State, County, **FIPS**, then a column per disease | `disease_county_year` (after wide→long conversion) |

The county shape is **wide** (one column per disease) — flatten to long
on ingest with `rowToLong()`.

## Steps

1. **Download** the CSV from CDC (manual for now — automation lives in
   a scrape job later).

2. **Parse rows** into `RawCountyRow` objects (any CSV lib — `csv-parse`
   is fine).

3. **Convert wide→long** per row:
   ```ts
   import { rowToLong } from '@tickpedia/db/ingest/cdc-county'
   const longRows = rowToLong(rawRow, year)
   ```

4. **Resolve disease slugs to IDs.** Each `longRow.diseaseSlug` must
   match either `diseases.slug` or an entry in `diseases.aliases`:
   ```sql
   SELECT id FROM diseases WHERE slug = $1 OR $1 = ANY(aliases) LIMIT 1
   ```
   If nothing matches, you've got a new disease — add it to
   `db/src/seeds/diseases.ts` and reseed *before* inserting.

5. **Upsert counties** keyed by FIPS. Counties rarely change but the
   ingest is idempotent if you `ON CONFLICT (fips) DO NOTHING`.

6. **Upsert counts** with `ON CONFLICT (county_fips, disease_id, year)
   DO UPDATE SET count = EXCLUDED.count`. Surveillance gets backfilled —
   never assume the latest run is additive.

## Don'ts

- Don't store FIPS as `INTEGER`. Alabama is `01001`; the leading zero is
  part of the identifier.
- Don't insert raw column headers as slugs. Always pass through
  `slugify()` — different CDC PDFs use different casings for the same
  disease.
- Don't drop suppressed cells (`*` / `<5`) silently in production.
  `rowToLong` skips them today; if surveillance accuracy ever matters,
  store them as a separate `is_suppressed: true` row.

## Adding a new disease

1. Add a `CanonicalDisease` to `db/src/seeds/diseases.ts`.
2. Include all alias variants you've seen (CDC PDF, state DOH spreadsheet,
   etc.) — already slugified.
3. Reseed (`pnpm --filter @tickpedia/db db:seed:diseases` — write that
   script when you need it; today the main seed is `db:seed`).
4. Add the loose-string variant to the unit test in
   `db/src/__tests__/diseases-seed.test.ts` so we don't regress.
