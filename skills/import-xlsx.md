# Skill: import-xlsx

Take any spreadsheet (xlsx) and turn it into rows in the Tickpedia DB
without ever creating duplicates — even after re-importing 10,000 times.

The admin panel at `admin.tickpedia.com` has three import modes; this
skill walks through how to pick one, how to extend them, and what to do
when an xlsx doesn't fit any of them.

> **Operator note:** at scale (5,000+ paths) you live and die by three
> things — batched upserts so the function doesn't time out, idempotent
> natural keys so re-runs are free, and tight error feedback so a bad
> source file doesn't cost you a day of debugging. The "performance &
> reliability" and "common gotchas" sections below are where most of
> that knowledge lives.

## TL;DR — the happy path

1. Sign in to the admin panel as an allowlisted user.
2. **Imports → pick the mode** that matches the file shape (table below).
3. Drop the xlsx into the form, fill in the year (where required),
   click **Import**.
4. Read the summary card. `applied` is the number of rows written;
   `skipped` is the number we intentionally dropped (e.g. "No records"
   tick presence rows); `errors` lists rows we couldn't ingest with the
   reason and the original cell values.
5. If errors point at unknown diseases or ticks, add them under
   **Content → Diseases / Ticks** and re-import. The natural-key unique
   indexes mean the re-run only touches the rows that were missing.

## Picking a mode

| Source file looks like… | Mode | Table written |
|---|---|---|
| Wide CDC county-year disease counts (cols: `State, County, FIPS, <disease>…`) | **CDC disease counts** | `disease_county_year` |
| One-tick-per-file presence (cols: `FIPS, State, County, Status, Source, Source Comments`) | **Tick presence** → "Single tick" | `tick_county` |
| Multi-tick presence (e.g. `Ixodes_scapularis_County_Status` + `Ixodes_pacificus_county_status` paired with `_data_source` columns) | **Tick presence** → "Multi-tick (auto-detect)" | `tick_county` |
| Monthly national totals (long: `Year, Month, Disease, Count`; or wide: `Year, Month, <disease>…`) | **CDC monthly counts** | `disease_month` |

The CDC site (https://www.cdc.gov/ticks/data-research/facts-stats/) is
the upstream for all three.

## Idempotency contract

Every import path uses a `UNIQUE` index on a natural key and Postgres
`ON CONFLICT DO UPDATE`:

| Table | Natural key |
|---|---|
| `disease_county_year` | `(county_fips, disease_id, year)` |
| `disease_month`       | `(year, month, disease_id)` |
| `tick_county`         | `(tick_id, county_fips, year)` |

So **importing the exact same xlsx twice never increases the row count**.
Re-importing a corrected xlsx updates the affected rows and bumps
`updated_at` so SemiLayer's change-tracking surfaces them as fresh.

## Extending a mode for a new file shape

The most common reason an import errors out is a column header or
disease name we haven't seen. Two things to do:

1. **Unknown disease**: add a `CanonicalDisease` to
   `db/src/seeds/diseases.ts`. Make sure the slugified column header
   (`slugify("Lyme disease")` → `lyme-disease`) is in the `aliases`
   list. Add a regression case to
   `db/src/__tests__/diseases-seed.test.ts`. Reseed:
   ```bash
   pnpm db:setup:local      # local
   pnpm db:setup:remote     # Neon
   ```

2. **Unknown tick**: add a `CanonicalTick` to `db/src/seeds/ticks.ts`,
   then reseed. Single-tick imports pick from this list in the dropdown;
   multi-tick imports match `<scientific_name>_status` columns to the
   `scientific_name` field after `lowercase + spaces→underscores`.

3. **New file shape entirely**: add a parser to
   `db/src/ingest/`, surface it from `db/src/ingest/index.ts`, then add
   a page under `apps/admin/src/app/(app)/import/<mode>/`. Follow the
   `cdc-county` page as a template — the pattern is:
   - server action that takes `FormData`, parses the xlsx via
     `apps/admin/src/lib/xlsx.ts`, and calls a db ingest function
   - a `'use client'` form using `useActionState` to render the
     `IngestSummary` card

## What lives where

- **Schema:** `db/src/schema.ts` (one source of truth)
- **Ingest helpers:** `db/src/ingest/{cdc-county,cdc-county-import,
  cdc-month-import,tick-county-import,summary}.ts`
- **Seeds:** `db/src/seeds/{diseases,ticks,removal-techniques}.ts`
- **xlsx parser:** `apps/admin/src/lib/xlsx.ts`
- **Admin import pages:** `apps/admin/src/app/(app)/import/*/page.tsx`
- **Admin content forms:** `apps/admin/src/app/(app)/content/*/page.tsx`
  (ticks, diseases, wild facts, removal techniques)
- **SemiLayer lenses:** `sl.config.ts` — every editorial / surveillance
  table has `changeTrackingColumn: 'updatedAt'` so callers can pull
  "what changed since X" without scanning the whole table

## When the file doesn't have a header on row 0

CDC's 2025 Ixodes file ships with a banner row before the actual
header. The tick-county import form has a "Header row index (advanced)"
input — set it to `1` for that file. The xlsx parser
(`parseXlsxAtRow`) skips n rows before reading the header.

## Sanity-checking a fresh DB

```bash
pnpm --filter @tickpedia/db test         # 8 test files, 58 tests
pnpm --filter @tickpedia/admin build     # next build, all routes compile
pnpm db:setup:local                      # docker pg + migrate + seed
```

A manual end-to-end smoke against the three real CDC files lives at
`db/src/__tests__/xlsx-smoke.ts`. Not part of `vitest run` because it
hits the database. Run it from the db package:
```bash
cd db
DATABASE_URL=postgresql://tickpedia:tickpedia@localhost:15432/tickpedia \
  pnpm exec tsx src/__tests__/xlsx-smoke.ts
```

## Performance & reliability (read before you ship a new ingest)

The admin runs on Vercel — serverless functions cap at **10s on Hobby /
60s on Pro**. A naive ingest that does one round-trip per row will hit
that ceiling on any meaningful CDC file:

| File | Rows in | Long rows out | Per-row latency cost |
|---|---|---|---|
| `AllTBD2022_Public.xlsx` | ~3,144 | ~28,000 (county × disease) | 28k × 5–10ms ≈ 2–5min ❌ |
| Single-tick presence | ~3,000 | ~3,000 | 3k × 5–10ms ≈ 15–30s ❌ |
| Multi-tick presence | ~3,000 | ~6,000 | 6k × 5–10ms ≈ 30–60s ❌ |

So:

- **Always batch.** Build the full row array in memory, then upsert in
  chunks of 500 with `db.insert(table).values(chunk).onConflictDoUpdate`.
  At chunk=500 a 28k-row file collapses to ~56 round-trips. The current
  three ingests (`db/src/ingest/{cdc-county,tick-county,cdc-month}-import.ts`)
  follow this pattern — copy them.
- **Don't wrap the chunked upserts in a `db.transaction(callback)`** —
  the Neon HTTP driver doesn't support callback transactions. Each chunk
  is its own statement; ON CONFLICT keeps the result consistent across
  partial failures (you'll just re-run on error).
- **Pre-load lookup tables once.** Resolve `slug → id` (diseases, ticks)
  and the FIPS allowlist before the row loop, not inside it. Each file
  touches at most a few thousand rows; loading the ~20-row diseases
  table once saves thousands of round-trips.
- **One error per row, not per cell.** Wide-format files multiply errors
  by the number of disease columns if you check inside the inner loop.
  Move per-row gates (unknown FIPS, malformed FIPS) before the disease
  loop so a bad row produces a single error, not 8.
- **If the import hangs at &quot;Importing&quot;**, the function timed out — the
  client side never sees the response close. Check Vercel logs; the fix
  is almost always batching or moving work to a background job.

## Common gotchas

- **Stale FIPS data**: the FCC `db/src/seeds/data/fips.txt` we ship is
  pre-2001 and missing post-2000 boundary changes. Counties added since
  (Broomfield CO `08014`, Miami-Dade FL `12086` rename, Connecticut
  planning regions, several AK boroughs) live in
  `db/src/seeds/locations/extra-counties.ts` as a deliberately tiny
  override list the loader merges in. When a real CDC file flags a
  county FIPS as unknown, **first check this file**; if it's a real
  county that's just not there, add a row and reseed.
- **Bogus CDC FIPS**: CDC&apos;s tick-borne disease tables sometimes
  ship rows with FIPS codes that don&apos;t exist in any FIPS register
  (e.g. `11031` &quot;District of Columbia / Montgomery&quot; — DC is
  `11001`, Montgomery County MD is `24031`). These are silently skipped
  via `KNOWN_BOGUS_FIPS` in `cdc-county-import.ts`. Add new ones there
  with a comment naming the source file and what we believe the upstream
  error is, rather than letting them spam the error list every run.
- **Disease aliases**: a column header like `Spotted fever rickettsiosis`
  needs to slugify to a disease slug or alias. If the import reports
  &quot;Unknown disease&quot;, check `db/src/seeds/diseases.ts` and add
  the header (lowercased, slugified) to that disease&apos;s `aliases`
  list — usually a one-line change. Don&apos;t create a duplicate disease.
- **Banner rows**: CDC&apos;s 2025 Ixodes file has a one-line banner
  before the actual header. The tick-county form has a &quot;header row
  index&quot; field — `1` skips one banner line. `parseXlsxAtRow` handles
  this in the parser.
- **CSV blob mode**: every xlsx import accepts a pasted CSV via the
  &quot;…or paste CSV&quot; textarea. Same parser path
  (`apps/admin/src/lib/xlsx.ts → parseSpreadsheetInput`), same shape
  rules. Useful for ad-hoc one-row corrections.

## Things to not do

- Don't bypass the natural-key unique indexes by writing rows directly
  with `db.insert(...).values(...)` and no `onConflictDoUpdate`. The
  whole point of this skill is that two imports of the same data are
  free.
- Don't store FIPS as `INTEGER`. Alabama is `01001`; the leading zero is
  part of the identifier. The xlsx parser pads numeric FIPS back to
  five characters before insert.
- Don't insert `tick_county` rows for ticks/counties that don't yet
  exist — the FK will throw. Add the tick under **Content → Ticks**
  first, or update `seeds/ticks.ts` and reseed.
- Don't put the SheetJS / xlsx dependency anywhere except the admin
  app + the db smoke test. Public site has no business loading it.
