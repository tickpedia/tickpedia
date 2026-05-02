import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../useTheme.js'
import { DEFAULT_THEME, STORAGE_KEY } from '../themes.js'

describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('starts at the default theme when nothing is stored', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe(DEFAULT_THEME)
  })

  it('hydrates from localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, 'night')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('night')
  })

  it('applies the data-theme attribute on mount', () => {
    renderHook(() => useTheme())
    expect(document.documentElement.getAttribute('data-theme')).toBe(DEFAULT_THEME)
  })

  it('updates state, attribute, and storage when setTheme is called', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('field'))
    expect(result.current.theme).toBe('field')
    expect(document.documentElement.getAttribute('data-theme')).toBe('field')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('field')
  })
})
