# Skill: add-a-table

End-to-end addition of a new table.

## Steps

1. **Schema** — edit `db/src/schema.ts`. Use Drizzle's `pgTable`. Add an
   index for any column you'll query / filter on. Use enums for fixed
   value sets so the type system catches drift.

2. **Migration** — generate and apply:
   ```bash
   pnpm --filter @tickpedia/db db:generate
   pnpm --filter @tickpedia/db db:migrate
   ```
   Commit the generated SQL under `db/migrations/`.

3. **Seed** — if it's data the dev/local flow needs, append to
   `db/src/seed.ts`. Keep seeds idempotent-ish (small inserts; nothing
   that breaks if run twice in a fresh DB).

4. **Test** — add a row to `db/src/__tests__/schema.test.ts` so the new
   export is covered. Optionally add a per-table CRUD test if behavior
   beyond schema shape exists.

5. **Lens (if the public site reads it)** — declare a SemiLayer lens for
   the new table in `sl.config.ts`, then `pnpm semilayer:push` and
   `pnpm semilayer:generate`. The browser consumes types from the
   regenerated `generated/semilayer/`. Never import `@tickpedia/db` in
   the browser.

   See [add-a-lens](./add-a-lens.md).

## Don'ts

- Don't add a table without an index on the columns the UI filters on.
- Don't import Drizzle from `apps/web`. The browser doesn't talk to Neon.
