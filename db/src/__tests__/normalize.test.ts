import { describe, it, expect } from 'vitest'
import { slugify, diseaseSlug, fipsFromParts, isFips } from '../normalize.js'

describe('slugify', () => {
  it('lowercases and dashes', () => {
    expect(slugify('Lyme Disease')).toBe('lyme-disease')
  })

  it('collapses non-alphanumerics', () => {
    expect(slugify('Spotted Fever Rickettsiosis')).toBe('spotted-fever-rickettsiosis')
    expect(slugify('Spotted fever rickettsiosis')).toBe('spotted-fever-rickettsiosis')
  })

  it('strips edge dashes', () => {
    expect(slugify('  Lyme!  ')).toBe('lyme')
    expect(slugify('---Lyme---')).toBe('lyme')
  })

  it('handles slashes (Undetermined ehrlichiosis/anaplasmosis)', () => {
    expect(slugify('Undetermined ehrlichiosis/anaplasmosis')).toBe(
      'undetermined-ehrlichiosis-anaplasmosis',
    )
    expect(slugify('Undetermined ehrlichiosis/ anaplasmosis')).toBe(
      'undetermined-ehrlichiosis-anaplasmosis',
    )
  })

  it('strips diacritics', () => {
    expect(slugify('Café')).toBe('cafe')
  })

  it('diseaseSlug is an alias for slugify', () => {
    expect(diseaseSlug('Lyme Disease')).toBe(slugify('Lyme Disease'))
  })
})

describe('fipsFromParts', () => {
  it('preserves leading zero on state', () => {
    expect(fipsFromParts('1', '1')).toBe('01001')
    expect(fipsFromParts('01', '001')).toBe('01001')
  })

  it('truncates over-long parts to keep 5-char total', () => {
    expect(fipsFromParts('001', '0001')).toBe('01001')
  })
})

describe('isFips', () => {
  it('accepts 5-digit numeric strings', () => {
    expect(isFips('01001')).toBe(true)
    expect(isFips('51840')).toBe(true)
  })

  it('rejects non-5-char or non-numeric', () => {
    expect(isFips('1001')).toBe(false)
    expect(isFips('010010')).toBe(false)
    expect(isFips('A1001')).toBe(false)
    expect(isFips('')).toBe(false)
  })
})
