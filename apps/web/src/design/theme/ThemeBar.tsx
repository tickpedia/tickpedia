import { useTheme } from './useTheme.js'
import { THEMES, THEME_LABELS } from './themes.js'

// Floating capsule at bottom-right that switches the active theme.
// Uses `aria-pressed` so the active button is announceable to screen
// readers.

export function ThemeBar() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="tp-theme-bar" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTheme(t)}
          aria-pressed={t === theme}
        >
          {THEME_LABELS[t]}
        </button>
      ))}
    </div>
  )
}
