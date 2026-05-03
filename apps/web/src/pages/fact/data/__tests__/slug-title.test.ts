import { describe, it, expect } from 'vitest'
import { titleizeSlug, citationHostname, clampBody } from '../slug-title.js'

describe('titleizeSlug', () => {
  it('capitalizes the first letter of every word (small prepositions kept lowercase mid-string)', () => {
    expect(titleizeSlug('lyme-disease-spreads-by-tick')).toBe('Lyme Disease Spreads by Tick')
    expect(titleizeSlug('cumberland-county-maine')).toBe('Cumberland County Maine')
  })

  it('keeps small words lowercase except at the start', () => {
    expect(titleizeSlug('the-tick-of-the-northeast')).toBe('The Tick of the Northeast')
  })

  it('uppercases known acronyms', () => {
    expect(titleizeSlug('rmsf-cases-rising')).toBe('RMSF Cases Rising')
    expect(titleizeSlug('cdc-recommends-tweezers')).toBe('CDC Recommends Tweezers')
  })

  it('returns empty string for empty slug', () => {
    expect(titleizeSlug('')).toBe('')
    expect(titleizeSlug('---')).toBe('')
  })

  it('always capitalizes the first word even when it would be a small word', () => {
    expect(titleizeSlug('the-blacklegged-tick')).toBe('The Blacklegged Tick')
    expect(titleizeSlug('a-curious-fact')).toBe('A Curious Fact')
  })
})

describe('citationHostname', () => {
  it('strips www. prefix', () => {
    expect(citationHostname('https://www.cdc.gov/ticks')).toBe('cdc.gov')
  })

  it('returns just the hostname for a long URL', () => {
    expect(citationHostname('https://www.example.org/foo/bar?x=1')).toBe('example.org')
  })

  it('returns "source" for null / undefined', () => {
    expect(citationHostname(null)).toBe('source')
    expect(citationHostname(undefined)).toBe('source')
  })

  it('returns "source" when the URL is malformed', () => {
    expect(citationHostname('not a url')).toBe('source')
  })
})

describe('clampBody', () => {
  it('passes short text through untouched', () => {
    expect(clampBody('hello world', 50)).toBe('hello world')
  })

  it('clamps at a word boundary with an ellipsis', () => {
    const long = 'word '.repeat(40).trim()
    const out = clampBody(long, 30)
    expect(out.length).toBeLessThanOrEqual(30)
    expect(out.endsWith('…')).toBe(true)
  })

  it('returns empty for null / empty', () => {
    expect(clampBody(null, 30)).toBe('')
    expect(clampBody('', 30)).toBe('')
  })

  it('trims surrounding whitespace before checking length', () => {
    expect(clampBody('   hi   ', 30)).toBe('hi')
  })
})
