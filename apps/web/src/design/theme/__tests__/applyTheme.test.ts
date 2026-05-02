import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyThemeAttribute,
  readStoredTheme,
  writeStoredTheme,
} from '../applyTheme.js'
import { DEFAULT_THEME, STORAGE_KEY } from '../themes.js'

describe('readStoredTheme', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns the default when nothing is stored', () => {
    expect(readStoredTheme()).toBe(DEFAULT_THEME)
  })

  it('returns the stored theme when valid', () => {
    window.localStorage.setItem(STORAGE_KEY, 'night')
    expect(readStoredTheme()).toBe('night')
  })

  it('falls back to the default for an unknown stored value', () => {
    window.localStorage.setItem(STORAGE_KEY, 'midnight')
    expect(readStoredTheme()).toBe(DEFAULT_THEME)
  })
})

describe('writeStoredTheme', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists the theme to localStorage', () => {
    writeStoredTheme('field')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('field')
  })

  it('overwrites a previous value', () => {
    writeStoredTheme('night')
    writeStoredTheme('contrast')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('contrast')
  })
})

describe('applyThemeAttribute', () => {
  it('sets data-theme on <html>', () => {
    applyThemeAttribute('night')
    expect(document.documentElement.getAttribute('data-theme')).toBe('night')

    applyThemeAttribute('paper')
    expect(document.documentElement.getAttribute('data-theme')).toBe('paper')
  })
})
