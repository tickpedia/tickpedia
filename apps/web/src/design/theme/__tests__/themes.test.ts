import { describe, it, expect } from 'vitest'
import { THEMES, DEFAULT_THEME, isTheme, THEME_LABELS } from '../themes.js'

describe('THEMES', () => {
  it('contains exactly the four shipped themes in stable order', () => {
    expect(THEMES).toEqual(['paper', 'field', 'night', 'contrast'])
  })

  it('has a label per theme', () => {
    for (const t of THEMES) {
      expect(THEME_LABELS[t]).toBeTruthy()
    }
  })

  it('defaults to paper', () => {
    expect(DEFAULT_THEME).toBe('paper')
  })
})

describe('isTheme', () => {
  it('accepts every shipped theme', () => {
    for (const t of THEMES) {
      expect(isTheme(t)).toBe(true)
    }
  })

  it('rejects unknown strings', () => {
    expect(isTheme('dark')).toBe(false)
    expect(isTheme('')).toBe(false)
    expect(isTheme('PAPER')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isTheme(null)).toBe(false)
    expect(isTheme(undefined)).toBe(false)
    expect(isTheme(123)).toBe(false)
    expect(isTheme({})).toBe(false)
  })
})
