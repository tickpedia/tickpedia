// Size resolution for the heraldic crest.
//
// Three named variants (badge / tile / hero) cover the three
// publishing surfaces (favicon-or-mark / grid-or-card / page-hero).
// Numeric sizes are also supported and resolve to the closest variant
// for ring-text behaviour.

export type TickCrestVariant = 'badge' | 'tile' | 'hero'

export const SIZE_PX: Record<TickCrestVariant, number> = {
  badge: 28,
  tile: 80,
  hero: 220,
}

export function resolveDimensionPx(size: TickCrestVariant | number): number {
  return typeof size === 'number' ? size : SIZE_PX[size]
}

export function resolveVariant(size: TickCrestVariant | number): TickCrestVariant {
  if (typeof size !== 'number') return size
  if (size >= 160) return 'hero'
  if (size >= 56) return 'tile'
  return 'badge'
}
