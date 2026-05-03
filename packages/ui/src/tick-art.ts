// Hero art for a tick: two circles (head + body) and optional eight legs.
//
// Pure function — same colors in, same SVG out. The admin renders this
// inline as a live preview; the public site renders it server-side; and
// `tickSvgDataUrl` produces a `data:image/svg+xml;base64,...` URL for
// places that need a regular <img src>.

export interface TickArtColors {
  headColor: string | null
  bodyColor: string | null
  legColor: string | null
}

export const DEFAULT_TICK_ART = {
  headColor: '#3a2a1a',
  bodyColor: '#7a4a2a',
  legColor: '#2a1a10',
} as const

export function tickSvg(colors: TickArtColors): string {
  const head = colors.headColor || DEFAULT_TICK_ART.headColor
  const body = colors.bodyColor || DEFAULT_TICK_ART.bodyColor
  const leg = colors.legColor || DEFAULT_TICK_ART.legColor

  const showLegs = !!colors.legColor

  const legs = showLegs
    ? `
    <g stroke="${leg}" stroke-width="3" stroke-linecap="round" fill="none">
      <path d="M36 50 L28 46" />
      <path d="M34 60 L24 60" />
      <path d="M34 70 L26 76" />
      <path d="M38 80 L32 88" />
      <path d="M64 50 L72 46" />
      <path d="M66 60 L76 60" />
      <path d="M66 70 L74 76" />
      <path d="M62 80 L68 88" />
    </g>`
    : ''

  // Body is taller than wide (rx<ry) so the silhouette reads more like an
  // uppercase O than a squat oval. Head sits just above.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="tick illustration">${legs}
  <ellipse cx="50" cy="62" rx="16" ry="22" fill="${body}" />
  <circle cx="50" cy="34" r="10" fill="${head}" />
</svg>`
}

export function tickSvgDataUrl(colors: TickArtColors): string {
  const svg = tickSvg(colors)
  const b64 = typeof Buffer !== 'undefined' ? Buffer.from(svg).toString('base64') : btoa(svg)
  return `data:image/svg+xml;base64,${b64}`
}

export function hasTickArt(colors: TickArtColors): boolean {
  return !!(colors.headColor || colors.bodyColor)
}

export interface TickCrestSvgOptions {
  /** Color of the ring, double-ring outline, and four compass marks.
   *  Defaults to the paper-theme ink (`#1c1814`). */
  ringColor?: string
}

/**
 * Full heraldic crest as an SVG string: outer double-ring + four
 * compass marks + the same body + head + legs as `tickSvg`. This is
 * the canonical "ringed crest" — both the React `<TickCrest>`
 * component and the OG image generator render the same primitives,
 * sourced from this single function.
 */
export function tickCrestSvg(
  colors: TickArtColors,
  opts: TickCrestSvgOptions = {},
): string {
  const head = colors.headColor || DEFAULT_TICK_ART.headColor
  const body = colors.bodyColor || DEFAULT_TICK_ART.bodyColor
  const leg = colors.legColor || DEFAULT_TICK_ART.legColor
  const ringColor = opts.ringColor ?? '#1c1814'

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="tick crest">
  <circle cx="50" cy="50" r="48" fill="none" stroke="${ringColor}" stroke-width="1.25" opacity="0.28" />
  <circle cx="50" cy="50" r="46" fill="none" stroke="${ringColor}" stroke-width="0.75" opacity="0.18" />
  <line x1="50" y1="3" x2="50" y2="6" stroke="${ringColor}" stroke-width="1.25" stroke-linecap="round" opacity="0.4" />
  <line x1="97" y1="50" x2="94" y2="50" stroke="${ringColor}" stroke-width="1.25" stroke-linecap="round" opacity="0.4" />
  <line x1="50" y1="97" x2="50" y2="94" stroke="${ringColor}" stroke-width="1.25" stroke-linecap="round" opacity="0.4" />
  <line x1="3" y1="50" x2="6" y2="50" stroke="${ringColor}" stroke-width="1.25" stroke-linecap="round" opacity="0.4" />
  <g stroke="${leg}" stroke-width="3" stroke-linecap="round" fill="none">
    <path d="M36 50 L28 46" />
    <path d="M34 60 L24 60" />
    <path d="M34 70 L26 76" />
    <path d="M38 80 L32 88" />
    <path d="M64 50 L72 46" />
    <path d="M66 60 L76 60" />
    <path d="M66 70 L74 76" />
    <path d="M62 80 L68 88" />
  </g>
  <ellipse cx="50" cy="62" rx="16" ry="22" fill="${body}" />
  <circle cx="50" cy="34" r="10" fill="${head}" />
</svg>`
}
