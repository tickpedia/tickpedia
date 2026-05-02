import { describe, it, expect } from 'vitest'
import {
  parseSingleTickRows,
  parseMultiTickRows,
  parseStatus,
} from '../ingest/tick-county-import.js'

describe('parseStatus', () => {
  it('maps the three CDC values', () => {
    expect(parseStatus('Established')).toBe('established')
    expect(parseStatus('Reported')).toBe('reported')
    expect(parseStatus('No records')).toBe('no_records')
  })

  it('is case-insensitive and trim-tolerant', () => {
    expect(parseStatus('  ESTABLISHED  ')).toBe('established')
    expect(parseStatus('no record')).toBe('no_records')
  })

  it('returns null for empty/unknown', () => {
    expect(parseStatus('')).toBeNull()
    expect(parseStatus(null)).toBeNull()
    expect(parseStatus(undefined)).toBeNull()
    expect(parseStatus('Maybe?')).toBeNull()
  })
})

describe('parseSingleTickRows (lone-star layout)', () => {
  it('flattens to TickCountyRow with leading-zero FIPS', () => {
    const { rows, errors } = parseSingleTickRows(
      [
        { FIPS: 1001, State: 'AL', County: 'Autauga County', Status: 'No records' },
        { FIPS: '01003', State: 'AL', County: 'Baldwin County', Status: 'Established', Source: 'ArboNET Data' },
      ],
      { tickSlug: 'amblyomma-americanum', year: 2024 },
    )
    expect(errors).toEqual([])
    expect(rows).toHaveLength(2)
    expect(rows[0]?.countyFips).toBe('01001') // numeric → padded
    expect(rows[0]?.status).toBe('no_records')
    expect(rows[1]?.countyFips).toBe('01003')
    expect(rows[1]?.status).toBe('established')
    expect(rows[1]?.source).toBe('ArboNET Data')
    expect(rows[0]?.tickSlug).toBe('amblyomma-americanum')
    expect(rows[0]?.year).toBe(2024)
  })

  it('records errors for bad FIPS or unknown status', () => {
    const { rows, errors } = parseSingleTickRows(
      [
        { FIPS: '', Status: 'Established' },
        { FIPS: '01001', Status: 'Maybe' },
      ],
      { tickSlug: 'amblyomma-americanum', year: 2024 },
    )
    expect(rows).toHaveLength(0)
    expect(errors).toHaveLength(2)
    expect(errors[0]?.reason).toMatch(/FIPS/)
    expect(errors[1]?.reason).toMatch(/status/i)
  })
})

describe('parseMultiTickRows (Ixodes layout)', () => {
  it('expands two ticks per row into two long rows', () => {
    const { rows, errors } = parseMultiTickRows(
      [
        {
          FIPSCode: '01001',
          State: 'AL',
          County: 'Autauga County',
          Ixodes_scapularis_County_Status: 'Established',
          Ixodes_scapularis_data_source: 'CDC ArboNET',
          Ixodes_pacificus_county_status: 'No records',
          Ixodes_pacificus_data_source: 'CDC ArboNET',
        },
      ],
      {
        fipsColumn: 'FIPSCode',
        year: 2025,
        ticks: [
          {
            tickSlug: 'ixodes-scapularis',
            statusColumn: 'Ixodes_scapularis_County_Status',
            sourceColumn: 'Ixodes_scapularis_data_source',
          },
          {
            tickSlug: 'ixodes-pacificus',
            statusColumn: 'Ixodes_pacificus_county_status',
            sourceColumn: 'Ixodes_pacificus_data_source',
          },
        ],
      },
    )
    expect(errors).toEqual([])
    expect(rows).toHaveLength(2)
    expect(rows[0]?.tickSlug).toBe('ixodes-scapularis')
    expect(rows[0]?.status).toBe('established')
    expect(rows[1]?.tickSlug).toBe('ixodes-pacificus')
    expect(rows[1]?.status).toBe('no_records')
  })

  it('skips ticks with blank status (rather than erroring)', () => {
    const { rows, errors } = parseMultiTickRows(
      [
        {
          FIPSCode: '01001',
          'Tick A status': 'Established',
          'Tick A source': 'X',
          'Tick B status': '',
          'Tick B source': '',
        },
      ],
      {
        fipsColumn: 'FIPSCode',
        year: 2025,
        ticks: [
          { tickSlug: 'tick-a', statusColumn: 'Tick A status', sourceColumn: 'Tick A source' },
          { tickSlug: 'tick-b', statusColumn: 'Tick B status', sourceColumn: 'Tick B source' },
        ],
      },
    )
    expect(errors).toEqual([])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.tickSlug).toBe('tick-a')
  })
})
