// Render-helper: append " County" to a raw county name unless the name
// already carries the type suffix. The DB seed strips most suffixes
// for canonical slugs, but keeps a few exceptions:
//   "Baltimore City"     → "Baltimore City"     (already suffixed)
//   "St. John the Baptist" → "St. John the Baptist Parish" — Louisiana's
//   parishes are kept verbatim because the suffix is "Parish" not "County"
// We keep this conservative: any name that already ends in
// " County", " City", " Parish", " Borough", or " Census Area" is
// passed through; everything else gets " County" appended.

const ALREADY_SUFFIXED = /\s+(County|City|Parish|Borough|Census Area|Municipality|Municipio|Island)\s*$/i

export function formatCountyName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) return ''
  if (ALREADY_SUFFIXED.test(trimmed)) return trimmed
  return `${trimmed} County`
}
