import { DEFAULT_THEME, STORAGE_KEY, isTheme, type Theme } from './themes.js'

// Read / write the active theme. Side-effect-only; no React. Works in
// SSR-empty environments by no-oping when `document` / `localStorage`
// are missing.

export function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return isTheme(v) ? v : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function writeStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore — quota / private mode / etc.
  }
}

export function applyThemeAttribute(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}
