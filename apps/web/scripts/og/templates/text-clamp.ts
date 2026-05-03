// Truncation helpers for OG templates. satori's text-overflow support
// is spotty, so we clamp at the data layer.

const ELLIPSIS = '…'

/**
 * Trim a single string at a word boundary so it fits in the given
 * maxChars. The result will not exceed `maxChars` (including the
 * ellipsis) and ends on a whole word when possible.
 */
export function clamp2Lines(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const cutoff = text.slice(0, maxChars - 1)
  const lastSpace = cutoff.lastIndexOf(' ')
  const trim = lastSpace > Math.floor(maxChars / 2) ? cutoff.slice(0, lastSpace) : cutoff
  return trim + ELLIPSIS
}

/**
 * Pick a font size that lets `text` fit in `lines` lines at width
 * `widthPx` for the given font family. The numbers are calibrated
 * for Newsreader (the OG hero face) — short facts get the biggest
 * size, long ones step down.
 */
export function autoFitFontSize(
  text: string,
  opts: { minPx: number; maxPx: number; idealCharsPerLine: number; targetLines: number },
): number {
  const { minPx, maxPx, idealCharsPerLine, targetLines } = opts
  // Approximate: at fontSize=1, characters ≈ 0.5 wide.
  // total chars / ideal width per line ≈ rendered lines.
  // We want renderedLines ≈ targetLines.
  const charCount = text.length
  const approxLines = (size: number) => charCount / Math.max(1, idealCharsPerLine * (size / maxPx))
  // Binary search for the size that lands closest to targetLines.
  let lo = minPx
  let hi = maxPx
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2
    if (approxLines(mid) > targetLines) hi = mid
    else lo = mid
  }
  return Math.round(lo)
}
