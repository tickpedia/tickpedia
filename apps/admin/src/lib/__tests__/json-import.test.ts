import { describe, it, expect } from 'vitest'
import { normalizeOneLiner, ONE_LINER_HARD_CAP } from '../json-import'

describe('normalizeOneLiner', () => {
  it('returns the trimmed value for a normal string', () => {
    const r = normalizeOneLiner('  The black-legged tick spreads Lyme disease.  ')
    expect(r).toEqual({ value: 'The black-legged tick spreads Lyme disease.' })
  })

  it('returns null for an empty string', () => {
    expect(normalizeOneLiner('')).toEqual({ value: null })
  })

  it('returns null for a whitespace-only string', () => {
    expect(normalizeOneLiner('    \t\n  ')).toEqual({ value: null })
  })

  it('returns null for non-string inputs (undefined, null, number, object)', () => {
    expect(normalizeOneLiner(undefined)).toEqual({ value: null })
    expect(normalizeOneLiner(null)).toEqual({ value: null })
    expect(normalizeOneLiner(42)).toEqual({ value: null })
    expect(normalizeOneLiner({ x: 'foo' })).toEqual({ value: null })
    expect(normalizeOneLiner(['a string in an array'])).toEqual({ value: null })
  })

  it('accepts a string at exactly the hard cap', () => {
    const s = 'a'.repeat(ONE_LINER_HARD_CAP)
    expect(normalizeOneLiner(s)).toEqual({ value: s })
  })

  it('rejects a string one over the hard cap', () => {
    const s = 'a'.repeat(ONE_LINER_HARD_CAP + 1)
    const r = normalizeOneLiner(s)
    expect(r).toHaveProperty('error')
    if ('error' in r) expect(r.error).toMatch(/exceeds 200 chars/)
  })

  it('measures length AFTER trimming, not before', () => {
    // 200 'a's surrounded by whitespace: pre-trim is over the cap, post-trim is at it.
    const s = '   ' + 'a'.repeat(ONE_LINER_HARD_CAP) + '   '
    expect(normalizeOneLiner(s)).toEqual({ value: 'a'.repeat(ONE_LINER_HARD_CAP) })
  })

  it('does not mind 155+ char strings — only the 200 hard cap is enforced', () => {
    // 156 should pass (UI warns, server accepts).
    const s = 'a'.repeat(156)
    expect(normalizeOneLiner(s)).toEqual({ value: s })
  })
})
