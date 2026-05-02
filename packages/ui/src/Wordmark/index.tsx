import type { CSSProperties } from 'react'

// "Tick<em>pedia</em>". Italic on `pedia` is the brand mark; the `em`
// inherits `var(--accent)` when design tokens are loaded, otherwise
// falls back to currentColor.

export interface WordmarkProps {
  size?: number
  className?: string
  style?: CSSProperties
}

export function Wordmark({ size = 22, className, style }: WordmarkProps) {
  const merged: CSSProperties = {
    fontFamily: '"Newsreader", Georgia, serif',
    fontWeight: 500,
    letterSpacing: '-0.015em',
    fontSize: size,
    lineHeight: 1,
    display: 'inline-block',
    ...style,
  }
  return (
    <span className={className} style={merged}>
      Tick<em style={{ color: 'var(--accent, currentColor)', fontWeight: 500 }}>pedia</em>
    </span>
  )
}
