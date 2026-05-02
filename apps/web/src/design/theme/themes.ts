// The four themes Tickpedia ships. The `data-theme` attribute on <html>
// switches the CSS-token block in `tokens.css`.

export const THEMES = ['paper', 'field', 'night', 'contrast'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'paper'

export const THEME_LABELS: Record<Theme, string> = {
  paper: 'Paper',
  field: 'Field',
  night: 'Night',
  contrast: 'Contrast',
}

export const STORAGE_KEY = 'tp-theme'

export function isTheme(v: unknown): v is Theme {
  return typeof v === 'string' && (THEMES as readonly string[]).includes(v)
}
