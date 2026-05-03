import { describe, it, expect } from 'vitest'
import { parseSteps } from '../steps.js'

describe('parseSteps', () => {
  it('returns an empty array for empty / null input', () => {
    expect(parseSteps(null)).toEqual([])
    expect(parseSteps(undefined)).toEqual([])
    expect(parseSteps('')).toEqual([])
    expect(parseSteps('   \n   \n   ')).toEqual([])
  })

  it('strips numeric prefixes ("1.", "2)", "3:")', () => {
    const out = parseSteps('1. Foo\n2) Bar\n3: Baz')
    expect(out).toEqual([
      { position: 1, text: 'Foo' },
      { position: 2, text: 'Bar' },
      { position: 3, text: 'Baz' },
    ])
  })

  it('strips bullet prefixes ("-", "*", "•")', () => {
    const out = parseSteps('- alpha\n* beta\n• gamma')
    expect(out.map((s) => s.text)).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('renumbers positions starting at 1 regardless of source numbering', () => {
    const out = parseSteps('5. fifth\n6. sixth')
    expect(out.map((s) => s.position)).toEqual([1, 2])
  })

  it('passes plain lines through unchanged', () => {
    const out = parseSteps('See a clinician within 72 hours\nfollow up at 30 days')
    expect(out).toEqual([
      { position: 1, text: 'See a clinician within 72 hours' },
      { position: 2, text: 'follow up at 30 days' },
    ])
  })

  it('skips blank lines but keeps line order', () => {
    const out = parseSteps('1. one\n\n\n2. two')
    expect(out).toEqual([
      { position: 1, text: 'one' },
      { position: 2, text: 'two' },
    ])
  })

  it('handles the canonical CDC seed format verbatim', () => {
    const seed = [
      '1. Use clean, fine-tipped tweezers to grasp the tick as close to the skin as possible.',
      '2. Pull upward with steady, even pressure. Do not twist or jerk — that can leave mouth-parts behind.',
      '3. After removal, clean the bite area and your hands with rubbing alcohol or soap and water.',
      '4. Dispose of the tick by flushing it, sealing it in tape, or placing it in alcohol. Do not crush it with bare fingers.',
    ].join('\n')
    const out = parseSteps(seed)
    expect(out).toHaveLength(4)
    expect(out[0]?.position).toBe(1)
    expect(out[0]?.text).toMatch(/^Use clean/)
    expect(out[3]?.text).toMatch(/^Dispose of the tick/)
  })
})
