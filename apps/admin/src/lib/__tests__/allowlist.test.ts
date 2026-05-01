import { describe, it, expect } from 'vitest'
import { parseAllowedEmails, isAllowedEmail } from '../allowlist'

describe('parseAllowedEmails', () => {
  it('returns [] for undefined or empty', () => {
    expect(parseAllowedEmails(undefined)).toEqual([])
    expect(parseAllowedEmails('')).toEqual([])
    expect(parseAllowedEmails('   ')).toEqual([])
  })

  it('splits on commas and lowercases / trims', () => {
    expect(parseAllowedEmails(' Dan@Example.com , dave@tickpedia.com ')).toEqual([
      'dan@example.com',
      'dave@tickpedia.com',
    ])
  })

  it('drops empty entries', () => {
    expect(parseAllowedEmails('a@b.com,,,c@d.com,')).toEqual(['a@b.com', 'c@d.com'])
  })
})

describe('isAllowedEmail', () => {
  const allowed = ['dan@example.com', 'dave@tickpedia.com']

  it('rejects null / undefined / empty', () => {
    expect(isAllowedEmail(null, allowed)).toBe(false)
    expect(isAllowedEmail(undefined, allowed)).toBe(false)
    expect(isAllowedEmail('', allowed)).toBe(false)
  })

  it('matches case-insensitively', () => {
    expect(isAllowedEmail('Dan@Example.COM', allowed)).toBe(true)
  })

  it('rejects non-listed emails even when close', () => {
    expect(isAllowedEmail('dan@example.co', allowed)).toBe(false)
    expect(isAllowedEmail('attacker@example.com', allowed)).toBe(false)
  })
})
