// Shared helpers for the M:N editor flow used by ticks / diseases /
// wild facts / removal techniques.
//
// `setRelations` does a sync diff: rows in the join table that aren't
// in the requested set get deleted; new pairs get inserted. We do
// the diff statement-by-statement (no callback transaction) because
// the Neon HTTP driver doesn't support arbitrary callbacks — and
// admin-side concurrency on a single editor is theoretical anyway.

import { and, eq, getTableColumns } from 'drizzle-orm'
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core'
import type { Db } from '@tickpedia/db'

export interface JoinSpec<TJoin extends PgTable> {
  table: TJoin
  parentColumn: AnyPgColumn
  childColumn: AnyPgColumn
}

// Drizzle's `.values()` wants the schema's TS property name as the key
// (`tickId`), but call sites here only have the column reference — and
// the column's `.name` is the DB column name (`tick_id`). Reverse-look
// the TS name up from the table's columns map (object identity matches
// because both come from the same pgTable() factory).
function tsFieldName(table: PgTable, column: AnyPgColumn): string {
  const cols = getTableColumns(table) as Record<string, AnyPgColumn>
  for (const [field, col] of Object.entries(cols)) {
    if (col === column) return field
  }
  throw new Error(
    `setRelations: column "${column.name}" not part of the join table`,
  )
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
    const parentField = tsFieldName(spec.table, spec.parentColumn)
    const childField = tsFieldName(spec.table, spec.childColumn)
    const values = toInsert.map((id) => ({
      [parentField]: parentId,
      [childField]: id,
    }))
    await db.insert(spec.table).values(values as never)
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
