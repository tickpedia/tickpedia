// Normalize raw disease/state/county strings to stable slugs.
//
// Surveillance feeds are inconsistent: "Spotted Fever Rickettsiosis" vs
// "Spotted fever rickettsiosis", "Lyme disease" vs "lyme", etc. We slug
// once on ingest, then resolve to a `diseases.id` via slug or alias
// (`WHERE slug = $1 OR $1 = ANY(aliases)`).

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const diseaseSlug = slugify

export function fipsFromParts(stateFips: string, countyFips: string): string {
  const s = stateFips.padStart(2, '0').slice(-2)
  const c = countyFips.padStart(3, '0').slice(-3)
  return `${s}${c}`
}

export function isFips(value: string): boolean {
  return /^[0-9]{5}$/.test(value)
}
