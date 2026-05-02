import { describe, it, expect } from 'vitest'
import { resolveDimensionPx, resolveVariant, SIZE_PX } from '../sizes.js'

describe('TickCrest/sizes', () => {
  describe('resolveDimensionPx', () => {
    it('returns the named size in pixels', () => {
      expect(resolveDimensionPx('badge')).toBe(28)
      expect(resolveDimensionPx('tile')).toBe(80)
      expect(resolveDimensionPx('hero')).toBe(220)
    })

    it('passes numeric sizes through unchanged', () => {
      expect(resolveDimensionPx(48)).toBe(48)
      expect(resolveDimensionPx(0)).toBe(0)
      expect(resolveDimensionPx(512)).toBe(512)
    })

    it('SIZE_PX is the source of truth for the named map', () => {
      expect(SIZE_PX).toEqual({ badge: 28, tile: 80, hero: 220 })
    })
  })

  describe('resolveVariant', () => {
    it('returns named variants verbatim', () => {
      expect(resolveVariant('badge')).toBe('badge')
      expect(resolveVariant('tile')).toBe('tile')
      expect(resolveVariant('hero')).toBe('hero')
    })

    it('numeric ≥160 → hero', () => {
      expect(resolveVariant(160)).toBe('hero')
      expect(resolveVariant(220)).toBe('hero')
      expect(resolveVariant(1024)).toBe('hero')
    })

    it('numeric ≥56 and <160 → tile', () => {
      expect(resolveVariant(56)).toBe('tile')
      expect(resolveVariant(80)).toBe('tile')
      expect(resolveVariant(159)).toBe('tile')
    })

    it('numeric <56 → badge', () => {
      expect(resolveVariant(0)).toBe('badge')
      expect(resolveVariant(28)).toBe('badge')
      expect(resolveVariant(55)).toBe('badge')
    })
  })
})
