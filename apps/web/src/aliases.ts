// Alias-redirect table — every URL we want to absorb that isn't the
// canonical one. Built once at v1 from `plan/steps/05_design_handoff_and_urls.md`
// § B4; growing the list later is fine.
//
// At build time, `scripts/emit-alias-stubs.ts` walks this table and
// emits `dist/<from>/index.html` for each entry — a tiny stub
// containing both `<meta http-equiv="refresh">` and
// `<link rel="canonical">` to the `<to>` URL. GitHub Pages can't do
// real 301s, so this is the closest we get; the canonical link tells
// Google "the real page lives over there", and the meta refresh sends
// humans there too.

export interface Alias {
  /** The path the alias responds at (must start with `/`, no querystring). */
  from: string
  /** The canonical path it redirects to. */
  to: string
}

export const ALIASES: readonly Alias[] = [
  // Tick scientific names → common-name canonical
  { from: '/ticks/ixodes-scapularis',         to: '/ticks/blacklegged-tick' },
  { from: '/ticks/deer-tick',                 to: '/ticks/blacklegged-tick' },
  { from: '/ticks/dermacentor-variabilis',    to: '/ticks/american-dog-tick' },
  { from: '/ticks/amblyomma-americanum',      to: '/ticks/lone-star-tick' },
  { from: '/ticks/ixodes-pacificus',          to: '/ticks/western-blacklegged-tick' },
  { from: '/ticks/rhipicephalus-sanguineus',  to: '/ticks/brown-dog-tick' },

  // Disease alternates
  { from: '/diseases/borreliosis',                  to: '/diseases/lyme-disease' },
  { from: '/diseases/rocky-mountain-spotted-fever', to: '/diseases/spotted-fever-rickettsiosis' },
  { from: '/diseases/alpha-gal',                    to: '/diseases/alpha-gal-syndrome' },

  // State USPS / FIPS → full-name canonical
  { from: '/states/me', to: '/states/maine' },
  { from: '/states/23', to: '/states/maine' },

  // County FIPS → nested canonical
  { from: '/counties/23005', to: '/counties/maine/cumberland' },

  // High-intent search-phrase landing aliases → technique canonical
  { from: '/learn/how-to-remove-a-tick', to: '/techniques/fine-tipped-tweezers' },
  { from: '/learn/permethrin',           to: '/techniques/permethrin-clothing-treatment' },
  { from: '/learn/tick-tubes',           to: '/techniques/tick-tubes-damminix' },
] as const

/**
 * Render the static HTML stub a single alias compiles to. Self-contained
 * so the build script and the unit tests can both use it.
 *
 * The stub uses 0-second meta refresh + canonical link + a tiny human
 * fallback link. Search engines read the canonical; humans get the
 * refresh; assistive tech gets a real link.
 */
export function renderAliasStub(alias: Alias, origin = ''): string {
  const target = `${origin}${alias.to}`
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>Redirecting to ${alias.to}</title>`,
    `<link rel="canonical" href="${target}">`,
    `<meta http-equiv="refresh" content="0; url=${target}">`,
    '<meta name="robots" content="noindex">',
    '</head>',
    '<body>',
    `<p>This page has moved. Continue to <a href="${target}">${alias.to}</a>.</p>`,
    '</body>',
    '</html>',
    '',
  ].join('\n')
}
