// Build DOM-unique <defs> path IDs so multiple crests on one page
// don't clobber each other's ring-text paths.

export function slugifyForId(input: string, fallback = 'tick'): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}

export function buildPathIds(scientific: string, common: string, dim: number) {
  const base = slugifyForId(scientific || common)
  return {
    top: `tickcrest-top-${base}-${dim}`,
    bottom: `tickcrest-bot-${base}-${dim}`,
  }
}
