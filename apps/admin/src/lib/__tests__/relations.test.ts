import { describe, it, expect } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { schema } from '@tickpedia/db'
import type { SQL } from 'drizzle-orm'
import { setRelations } from '../relations'

// Drizzle's `.values()` keys must be schema TS-property names ('tickId'),
// not DB column names ('tick_id'). The first cut of setRelations built
// values from `column.name`, which silently inserted NULL for both
// foreign keys and tripped the not-null constraint at runtime — but
// only on the FIRST relation insert for a row, since pre-seeded rows
// hit the no-op `toInsert.length === 0` branch.
//
// These tests pin the wire-level SQL that setRelations now produces so
// the bug can't sneak back in via a refactor that goes back to
// `.values({ [column.name]: id })`.

interface CapturedExecute {
  sql: string
  params: unknown[]
}

function makeFakeDb(opts: { existingChildIds?: number[] } = {}) {
  const dialect = new PgDialect()
  const executes: CapturedExecute[] = []
  const deletes: { sql: string; params: unknown[] }[] = []

  const db = {
    select() {
      return {
        from() {
          return {
            where: async () =>
              (opts.existingChildIds ?? []).map((id) => ({ id })),
          }
        },
      }
    },
    delete() {
      return {
        where: async (cond: SQL) => {
          const compiled = dialect.sqlToQuery(cond)
          deletes.push({ sql: compiled.sql, params: compiled.params })
        },
      }
    },
    async execute(query: SQL) {
      const compiled = dialect.sqlToQuery(query)
      executes.push({ sql: compiled.sql, params: compiled.params })
    },
    // setRelations doesn't call this any more, but keep it so a
    // regression that returns to `.values()` would surface here too.
    insert() {
      return {
        values: async (rows: unknown) => {
          executes.push({ sql: `INSERT-VIA-VALUES`, params: [rows] })
        },
      }
    },
  } as never

  return { db, executes, deletes }
}

describe('setRelations', () => {
  it('inserts via raw SQL using DB column names (tick_id, disease_id)', async () => {
    const { db, executes } = makeFakeDb({ existingChildIds: [] })

    await setRelations(
      db,
      {
        table: schema.tickDiseases,
        parentColumn: schema.tickDiseases.diseaseId,
        childColumn: schema.tickDiseases.tickId,
      },
      42,
      [7, 9],
    )

    expect(executes).toHaveLength(1)
    const stmt = executes[0]!
    expect(stmt.sql.toLowerCase()).toContain('insert into "tick_diseases"')
    expect(stmt.sql).toContain('"disease_id"')
    expect(stmt.sql).toContain('"tick_id"')
    expect(stmt.sql).not.toBe('INSERT-VIA-VALUES')
    // Two child ids → two value tuples → 4 params (parentId is repeated
    // per tuple, child id once each).
    expect(stmt.params).toEqual([42, 7, 42, 9])
  })

  it('skips the insert when nothing new to add', async () => {
    const { db, executes } = makeFakeDb({ existingChildIds: [7, 9] })

    await setRelations(
      db,
      {
        table: schema.tickDiseases,
        parentColumn: schema.tickDiseases.diseaseId,
        childColumn: schema.tickDiseases.tickId,
      },
      42,
      [7, 9],
    )

    expect(executes).toHaveLength(0)
  })

  it('drops zero / NaN / negative child ids before insert', async () => {
    const { db, executes } = makeFakeDb({ existingChildIds: [] })

    await setRelations(
      db,
      {
        table: schema.tickDiseases,
        parentColumn: schema.tickDiseases.diseaseId,
        childColumn: schema.tickDiseases.tickId,
      },
      42,
      [0, -1, Number.NaN, 5],
    )

    expect(executes).toHaveLength(1)
    expect(executes[0]!.params).toEqual([42, 5])
  })

  it('deletes child ids that are no longer wanted', async () => {
    const { db, deletes, executes } = makeFakeDb({ existingChildIds: [7, 9, 11] })

    await setRelations(
      db,
      {
        table: schema.tickDiseases,
        parentColumn: schema.tickDiseases.diseaseId,
        childColumn: schema.tickDiseases.tickId,
      },
      42,
      [7, 99],
    )

    expect(deletes).toHaveLength(2)
    expect(executes).toHaveLength(1)
    expect(executes[0]!.params).toEqual([42, 99])
  })

  it('works for the wild_fact_diseases shape too', async () => {
    const { db, executes } = makeFakeDb({ existingChildIds: [] })

    await setRelations(
      db,
      {
        table: schema.wildFactDiseases,
        parentColumn: schema.wildFactDiseases.wildFactId,
        childColumn: schema.wildFactDiseases.diseaseId,
      },
      1,
      [2, 3],
    )

    const stmt = executes[0]!
    expect(stmt.sql.toLowerCase()).toContain('insert into "wild_fact_diseases"')
    expect(stmt.sql).toContain('"wild_fact_id"')
    expect(stmt.sql).toContain('"disease_id"')
  })
})
