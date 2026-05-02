import { useCallback, useEffect, useState } from 'react'
import { applyThemeAttribute, readStoredTheme, writeStoredTheme } from './applyTheme.js'
import type { Theme } from './themes.js'

// Theme state hook. Hydrates from localStorage on mount, applies the
// `data-theme` attribute, and persists changes. Components that need to
// switch the theme should call `setTheme` from this hook.

export function useTheme(): { theme: Theme; setTheme: (next: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme())

  useEffect(() => {
    applyThemeAttribute(theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    writeStoredTheme(next)
    setThemeState(next)
  }, [])

  return { theme, setTheme }
}
