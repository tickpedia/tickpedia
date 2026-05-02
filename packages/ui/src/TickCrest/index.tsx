import type { CSSProperties } from 'react'
import { DEFAULT_TICK_ART, type TickArtColors } from '../tick-art.js'
import { resolveDimensionPx, resolveVariant, type TickCrestVariant } from './sizes.js'
import { buildPathIds } from './path-id.js'
import { Legs } from './Legs.js'
import { Silhouette } from './Silhouette.js'
import { Ring } from './Ring.js'

// Heraldic tick medallion. Sibling of `TickArt`: same `TickArtColors`
// contract, richer presentation. Three sizes:
//
//   badge — 28px,  no ring text, used for nav marks / favicons
//   tile  — 80px,  ring text on top arc, used for grids / cards
//   hero  — 220px, ring text top + family epithet on bottom arc
//
// Use this on the public site. The admin's editor preview keeps using
// `TickArt` (simpler, no ring text) so the form stays compact.

export type TickCrestSize = TickCrestVariant | number

export interface TickCrestProps {
  colors: TickArtColors
  size?: TickCrestSize
  scientific?: string
  common?: string
  /** Defaults true; ignored at `badge` size. */
  ringText?: boolean
  /** Lower-arc text at `hero` size only. */
  familyEpithet?: string
  className?: string
  style?: CSSProperties
}

export function TickCrest({
  colors,
  size = 'tile',
  scientific = '',
  common = '',
  ringText = true,
  familyEpithet = 'IXODIDAE · HARD TICK',
  className,
  style,
}: TickCrestProps) {
  const head = colors.headColor || DEFAULT_TICK_ART.headColor
  const body = colors.bodyColor || DEFAULT_TICK_ART.bodyColor
  const leg = colors.legColor || DEFAULT_TICK_ART.legColor

  const dim = resolveDimensionPx(size)
  const variant = resolveVariant(size)
  const strokeWidth = variant === 'hero' ? 1.25 : 1
  const showRingText = ringText && variant !== 'badge'

  const ids = buildPathIds(scientific, common, dim)
  const ariaLabel = labelFor(common, scientific)

  return (
    <svg
      viewBox="0 0 100 100"
      width={dim}
      height={dim}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ display: 'inline-block', ...style }}
    >
      <Ring
        variant={variant}
        strokeWidth={strokeWidth}
        showText={showRingText}
        scientific={scientific}
        familyEpithet={familyEpithet}
        topPathId={ids.top}
        bottomPathId={ids.bottom}
      />
      <Legs color={leg} />
      <Silhouette headColor={head} bodyColor={body} ringStrokeWidth={strokeWidth} />
    </svg>
  )
}

function labelFor(common: string, scientific: string): string {
  if (common && scientific) return `${common} (${scientific}) crest`
  if (common) return `${common} crest`
  if (scientific) return `${scientific} crest`
  return 'tick crest'
}
