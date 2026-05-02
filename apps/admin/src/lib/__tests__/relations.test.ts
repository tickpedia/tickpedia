import { describe, it, expect } from 'vitest'
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core'
import { schema } from '@tickpedia/db'
import { setRelations } from '../relations'

interface AnyJoinSpec {
  table: PgTable
  parentColumn: AnyPgColumn
  childColumn: AnyPgColumn
}

// Two related bugs the seed data hid:
//
//  1. The first cut keyed `.values()` rows on `column.name` (the DB
//     column name, snake_case). Drizzle wants the schema's TS property
//     name (`tickId`); unmapped keys are silently dropped → not-null
//     FK constraint trips at the DB.
//  2. The first attempted fix used a raw sql template with column
//     references, but Drizzle renders an interpolated column ref as
//     the table-qualified form (`"tick_diseases"."tick_id"`), which
//     Postgres rejects in INSERT column lists. PG's error is
//     "column 'tick_diseases' of relation 'tick_diseases' does not
//     exist" because it parses the dotted form literally.
//
// Pre-seeded join rows hit the no-op `toInsert === 0` branch, so neither
// bug surfaced until the first user-driven import added a fresh M:N
// pair. These tests pin the wire shape so neither bug can sneak back.

interface CapturedInsert {
  table: unknown
  values: Record<string, unknown>[]
}

function makeFakeDb(opts: { existingChildIds?: number[] } = {}) {
  const inserts: CapturedInsert[] = []
  const deletes: number[] = []

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
    delete(table: unknown) {
      return {
        where: async () => {
          deletes.push((deletes.length + 1))
          void table
        },
      }
    },
    insert(table: unknown) {
      return {
        values: async (rows: Record<string, unknown>[]) => {
          inserts.push({ table, values: rows })
        },
      }
    },
  } as never

  return { db, inserts, deletes }
}

describe('setRelations', () => {
  it('passes TS property names to .values() (tickId, diseaseId), not DB names', async () => {
    const { db, inserts } = makeFakeDb({ existingChildIds: [] })

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

    expect(inserts).toHaveLength(1)
    const ins = inserts[0]!
    expect(ins.table).toBe(schema.tickDiseases)
    expect(ins.values).toEqual([
      { diseaseId: 42, tickId: 7 },
      { diseaseId: 42, tickId: 9 },
    ])

    // Negative assertions: the snake_case bug and the table-qualified
    // bug both produce keys that match these patterns.
    for (const row of ins.values) {
      for (const key of Object.keys(row)) {
        expect(key).not.toMatch(/_/) // no snake_case
        expect(key).not.toContain('.') // no table-qualified
        expect(key).not.toContain('"') // no quoted identifiers
      }
    }
  })

  it('skips the insert when nothing new to add', async () => {
    const { db, inserts } = makeFakeDb({ existingChildIds: [7, 9] })

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

    expect(inserts).toHaveLength(0)
  })

  it('drops zero / NaN / negative child ids before insert', async () => {
    const { db, inserts } = makeFakeDb({ existingChildIds: [] })

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

    expect(inserts).toHaveLength(1)
    expect(inserts[0]!.values).toEqual([{ diseaseId: 42, tickId: 5 }])
  })

  it('deletes child ids that are no longer wanted', async () => {
    const { db, inserts, deletes } = makeFakeDb({
      existingChildIds: [7, 9, 11],
    })

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

    expect(deletes.length).toBe(2)
    expect(inserts).toHaveLength(1)
    expect(inserts[0]!.values).toEqual([{ diseaseId: 42, tickId: 99 }])
  })

  it('resolves TS field names for every editorial M:N table', async () => {
    const cases: { spec: AnyJoinSpec; expected: Record<string, number> }[] = [
      {
        spec: {
          table: schema.tickDiseases,
          parentColumn: schema.tickDiseases.tickId,
          childColumn: schema.tickDiseases.diseaseId,
        },
        expected: { tickId: 1, diseaseId: 2 },
      },
      {
        spec: {
          table: schema.tickRemovalTechniques,
          parentColumn: schema.tickRemovalTechniques.tickId,
          childColumn: schema.tickRemovalTechniques.removalTechniqueId,
        },
        expected: { tickId: 1, removalTechniqueId: 2 },
      },
      {
        spec: {
          table: schema.wildFactTicks,
          parentColumn: schema.wildFactTicks.wildFactId,
          childColumn: schema.wildFactTicks.tickId,
        },
        expected: { wildFactId: 1, tickId: 2 },
      },
      {
        spec: {
          table: schema.wildFactDiseases,
          parentColumn: schema.wildFactDiseases.wildFactId,
          childColumn: schema.wildFactDiseases.diseaseId,
        },
        expected: { wildFactId: 1, diseaseId: 2 },
      },
      {
        spec: {
          table: schema.wildFactRemovalTechniques,
          parentColumn: schema.wildFactRemovalTechniques.wildFactId,
          childColumn: schema.wildFactRemovalTechniques.removalTechniqueId,
        },
        expected: { wildFactId: 1, removalTechniqueId: 2 },
      },
    ]

    for (const c of cases) {
      const { db, inserts } = makeFakeDb({ existingChildIds: [] })
      await setRelations(db, c.spec, 1, [2])
      expect(inserts).toHaveLength(1)
      expect(inserts[0]!.values).toEqual([c.expected])
    }
  })

  it('throws if a column reference is not part of the table', async () => {
    const { db } = makeFakeDb({ existingChildIds: [] })

    const spec: AnyJoinSpec = {
      table: schema.tickDiseases,
      parentColumn: schema.wildFactTicks.wildFactId, // wrong table on purpose
      childColumn: schema.tickDiseases.tickId,
    }

    await expect(setRelations(db, spec, 42, [7])).rejects.toThrow(
      /not part of the join table/,
    )
  })
})
