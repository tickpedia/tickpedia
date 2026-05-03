import { describe, it, expect } from 'vitest'
import { parseMonth } from '../ingest/cdc-month-import.js'

describe('parseMonth', () => {
  it('passes through valid integers', () => {
    expect(parseMonth(1)).toBe(1)
    expect(parseMonth(12)).toBe(12)
  })

  it('parses numeric strings', () => {
    expect(parseMonth('1')).toBe(1)
    expect(parseMonth('01')).toBe(1)
    expect(parseMonth('  12 ')).toBe(12)
  })

  it('parses full English month names', () => {
    expect(parseMonth('January')).toBe(1)
    expect(parseMonth('june')).toBe(6)
    expect(parseMonth('DECEMBER')).toBe(12)
  })

  it('parses three-letter abbreviations', () => {
    expect(parseMonth('Jan')).toBe(1)
    expect(parseMonth('mar')).toBe(3)
    expect(parseMonth('Sept')).toBe(9)
  })

  it('returns null for blank, out-of-range, or unrecognized values', () => {
    expect(parseMonth('')).toBeNull()
    expect(parseMonth(null)).toBeNull()
    expect(parseMonth(undefined)).toBeNull()
    expect(parseMonth(0)).toBeNull()
    expect(parseMonth(13)).toBeNull()
    expect(parseMonth('Smarch')).toBeNull()
  })
})
