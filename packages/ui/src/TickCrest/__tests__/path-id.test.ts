import { describe, it, expect } from 'vitest'
import { slugifyForId, buildPathIds } from '../path-id.js'

describe('TickCrest/path-id', () => {
  describe('slugifyForId', () => {
    it('lowercases and hyphenates a binomial name', () => {
      expect(slugifyForId('Ixodes scapularis')).toBe('ixodes-scapularis')
    })

    it('collapses consecutive non-alnum into a single hyphen', () => {
      expect(slugifyForId("Amblyomma  americanum")).toBe('amblyomma-americanum')
      expect(slugifyForId('Tick — sp.')).toBe('tick-sp')
    })

    it('strips leading and trailing hyphens', () => {
      expect(slugifyForId('  Tick  ')).toBe('tick')
      expect(slugifyForId('---tick---')).toBe('tick')
    })

    it('falls back when input is empty or all-symbol', () => {
      expect(slugifyForId('')).toBe('tick')
      expect(slugifyForId('  ')).toBe('tick')
      expect(slugifyForId('!!!')).toBe('tick')
      expect(slugifyForId('', 'fallback')).toBe('fallback')
    })
  })

  describe('buildPathIds', () => {
    it('prefers scientific name over common', () => {
      const ids = buildPathIds('Ixodes scapularis', 'Blacklegged tick', 80)
      expect(ids.top).toBe('tickcrest-top-ixodes-scapularis-80')
      expect(ids.bottom).toBe('tickcrest-bot-ixodes-scapularis-80')
    })

    it('falls back to common when scientific is empty', () => {
      const ids = buildPathIds('', 'Lone Star', 220)
      expect(ids.top).toBe('tickcrest-top-lone-star-220')
    })

    it('embeds the dimension so two crests of different sizes get unique IDs', () => {
      const a = buildPathIds('Ixodes scapularis', '', 28)
      const b = buildPathIds('Ixodes scapularis', '', 80)
      expect(a.top).not.toBe(b.top)
    })
  })
})
