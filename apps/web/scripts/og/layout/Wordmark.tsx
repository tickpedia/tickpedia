import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'

// "Tickpedia •" wordmark. Mirrors the look of the live <Wordmark>
// component without depending on @tickpedia/ui (which pulls React +
// CSS modules and would force satori to handle them). The OG tile is
// pure typography — a serif "Tickpedia" plus a small disc punctuation
// that doubles as a brand mark.

interface Props {
  /** Visual size in px. The wordmark scales relative to this. */
  size?: number
  /** Override the ink colour for dark backgrounds. */
  color?: string
}

export function Wordmark({ size = 28, color }: Props) {
  const fontSize = size
  const dotSize = Math.round(size * 0.35)
  const ink = color ?? OG_COLORS.ink
  const muted = color ?? OG_COLORS.muted

  const wrap: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: Math.round(size * 0.4),
    fontFamily: 'Newsreader',
    fontWeight: 500,
    fontSize,
    color: ink,
    letterSpacing: '-0.01em',
  }
  const dot: CSSProperties = {
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize,
    backgroundColor: muted,
    display: 'flex',
  }

  return (
    <div style={wrap}>
      <span>Tickpedia</span>
      <div style={dot} />
    </div>
  )
}
