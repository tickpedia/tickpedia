// Shared helpers for the M:N editor flow used by ticks / diseases /
// wild facts / removal techniques.
//
// `setRelations` does a sync diff: rows in the join table that aren't
// in the requested set get deleted; new pairs get inserted. We do
// the diff statement-by-statement (no callback transaction) because
// the Neon HTTP driver doesn't support arbitrary callbacks — and
// admin-side concurrency on a single editor is theoretical anyway.

import { and, eq, sql } from 'drizzle-orm'
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core'
import type { Db } from '@tickpedia/db'

export interface JoinSpec<TJoin extends PgTable> {
  table: TJoin
  parentColumn: AnyPgColumn
  childColumn: AnyPgColumn
}

export async function setRelations<TJoin extends PgTable>(
  db: Db,
  spec: JoinSpec<TJoin>,
  parentId: number,
  childIds: number[],
): Promise<void> {
  const wanted = new Set(childIds.filter((n) => Number.isInteger(n) && n > 0))

  const existing = (await db
    .select({ id: spec.childColumn })
    .from(spec.table)
    .where(eq(spec.parentColumn, parentId))) as { id: number }[]
  const have = new Set(existing.map((r) => r.id))

  const toDelete = [...have].filter((id) => !wanted.has(id))
  const toInsert = [...wanted].filter((id) => !have.has(id))

  for (const id of toDelete) {
    await db
      .delete(spec.table)
      .where(and(eq(spec.parentColumn, parentId), eq(spec.childColumn, id)))
  }

  if (toInsert.length > 0) {
    // Build the INSERT with a raw sql template. Drizzle's `.values()`
    // wants the schema's TS property names (`tickId`), but at this
    // call-site we only have the column references — and their `.name`
    // is the DB column name (`tick_id`). Mapping TS-name → DB-name in
    // userland is brittle; sql template-interpolating the column refs
    // produces the correct `"tick_id"` identifiers without round-trip.
    const rows = sql.join(
      toInsert.map((id) => sql`(${parentId}, ${id})`),
      sql`, `,
    )
    await db.execute(
      sql`insert into ${spec.table} (${spec.parentColumn}, ${spec.childColumn}) values ${rows}`,
    )
  }
}

// Pulls integer ids from `form.getAll(name)`. Empty values and NaN drop
// out so we never insert a zero-id row.
export function readIdList(form: FormData, name: string): number[] {
  return form
    .getAll(name)
    .map((v) => Number(String(v)))
    .filter((n) => Number.isInteger(n) && n > 0)
}
