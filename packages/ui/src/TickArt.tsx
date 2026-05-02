import type { CSSProperties } from 'react'
import { tickSvg, type TickArtColors } from './tick-art.js'

// Server- and client-safe React component. Inlines the SVG markup so it
// scales with currentColor / theme and stays crisp at any size.
export function TickArt({
  colors,
  size = 64,
  className,
  style,
}: {
  colors: TickArtColors
  size?: number | string
  className?: string
  style?: CSSProperties
}) {
  const merged: CSSProperties = {
    display: 'inline-block',
    width: size,
    height: size,
    ...style,
  }
  return (
    <span
      className={className}
      style={merged}
      // SVG is generated from validated colors only — see tick-art.ts.
      // Hex-color validation lives at the form/server boundary.
      dangerouslySetInnerHTML={{ __html: tickSvg(colors) }}
    />
  )
}
