import { describe, it, expect } from 'vitest'
import {
  parsePathogenRows,
  parsePathogenStatus,
} from '../ingest/pathogen-county-import.js'

describe('parsePathogenStatus', () => {
  it('normalizes the two CDC values', () => {
    expect(parsePathogenStatus('Present')).toBe('present')
    expect(parsePathogenStatus(' present ')).toBe('present')
    expect(parsePathogenStatus('No records')).toBe('no_records')
    expect(parsePathogenStatus('no record')).toBe('no_records')
    expect(parsePathogenStatus('NONE')).toBe('no_records')
  })

  it('returns null for unrecognized strings', () => {
    expect(parsePathogenStatus('Established')).toBeNull()
    expect(parsePathogenStatus('')).toBeNull()
    expect(parsePathogenStatus(null)).toBeNull()
  })
})

describe('parsePathogenRows', () => {
  it('emits one row per (pathogen, county) cell with a recognized status', () => {
    const raw = [
      {
        FIPS_Code: '01001',
        State: 'AL',
        County: 'Autauga County',
        Borrelia_burgdorferi_sensu_stricto_County_Status: 'No records',
        Borrelia_burgdorferi_sensu_stricto_Data_Source: 'CDC ArboNET',
        Babesia_microti_County_Status: 'Present',
        Babesia_microti_Data_Source: 'CDC ArboNET',
      },
    ]
    const { rows, errors } = parsePathogenRows(raw, {
      fipsColumn: 'FIPS_Code',
      year: 2024,
      pathogens: [
        {
          pathogenSlug: 'borrelia-burgdorferi',
          statusColumn: 'Borrelia_burgdorferi_sensu_stricto_County_Status',
          sourceColumn: 'Borrelia_burgdorferi_sensu_stricto_Data_Source',
        },
        {
          pathogenSlug: 'babesia-microti',
          statusColumn: 'Babesia_microti_County_Status',
          sourceColumn: 'Babesia_microti_Data_Source',
        },
      ],
    })
    expect(errors).toEqual([])
    expect(rows).toHaveLength(2)
    expect(rows[0]?.status).toBe('no_records')
    expect(rows[1]?.status).toBe('present')
    expect(rows[0]?.year).toBe(2024)
    expect(rows[0]?.countyFips).toBe('01001')
  })

  it('pads numeric FIPS back to 5 chars', () => {
    const { rows } = parsePathogenRows(
      [{ FIPS_Code: 1001, P_County_Status: 'Present', P_Data_Source: 'x' }],
      {
        fipsColumn: 'FIPS_Code',
        year: 2024,
        pathogens: [
          { pathogenSlug: 'p', statusColumn: 'P_County_Status', sourceColumn: 'P_Data_Source' },
        ],
      },
    )
    expect(rows[0]?.countyFips).toBe('01001')
  })

  it('errors on missing FIPS but keeps going', () => {
    const { rows, errors } = parsePathogenRows(
      [
        { FIPS_Code: '', P_County_Status: 'Present', P_Data_Source: 'x' },
        { FIPS_Code: '01001', P_County_Status: 'Present', P_Data_Source: 'x' },
      ],
      {
        fipsColumn: 'FIPS_Code',
        year: 2024,
        pathogens: [
          { pathogenSlug: 'p', statusColumn: 'P_County_Status', sourceColumn: 'P_Data_Source' },
        ],
      },
    )
    expect(errors).toHaveLength(1)
    expect(errors[0]?.reason).toMatch(/FIPS/)
    expect(rows).toHaveLength(1)
  })

  it('skips columns whose status cell is unrecognized rather than throwing', () => {
    const { rows, errors } = parsePathogenRows(
      [
        {
          FIPS_Code: '01001',
          P_County_Status: 'Sometimes maybe',
          P_Data_Source: 'x',
          Q_County_Status: 'Present',
          Q_Data_Source: 'y',
        },
      ],
      {
        fipsColumn: 'FIPS_Code',
        year: 2024,
        pathogens: [
          { pathogenSlug: 'p', statusColumn: 'P_County_Status', sourceColumn: 'P_Data_Source' },
          { pathogenSlug: 'q', statusColumn: 'Q_County_Status', sourceColumn: 'Q_Data_Source' },
        ],
      },
    )
    expect(errors).toEqual([])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.pathogenSlug).toBe('q')
  })
})
