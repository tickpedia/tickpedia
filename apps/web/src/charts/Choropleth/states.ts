// USPS code → state slug + display name. The Choropleth identifies
// cells by USPS code (so it can stay independent of which lens
// produced the data); callers that want clickable state cells need
// the slug for `/states/[slug]` URLs and the display name for tooltip
// copy.
//
// Slugs match the rule in step 05 §B2: full name lowercased and
// hyphenated (e.g. `north-carolina`, `new-york`). DC stays `dc`
// since "district-of-columbia" is unwieldy and the existing alias
// table already routes both ways.

export interface UspsState {
  /** Two-letter USPS code (uppercase). */
  code: string
  /** Lowercase, hyphenated state slug — matches `/states/[slug]`. */
  slug: string
  /** Title-cased display name. */
  name: string
}

export const STATES_BY_USPS: Readonly<Record<string, UspsState>> = Object.freeze({
  AL: { code: 'AL', slug: 'alabama',        name: 'Alabama' },
  AK: { code: 'AK', slug: 'alaska',         name: 'Alaska' },
  AZ: { code: 'AZ', slug: 'arizona',        name: 'Arizona' },
  AR: { code: 'AR', slug: 'arkansas',       name: 'Arkansas' },
  CA: { code: 'CA', slug: 'california',     name: 'California' },
  CO: { code: 'CO', slug: 'colorado',       name: 'Colorado' },
  CT: { code: 'CT', slug: 'connecticut',    name: 'Connecticut' },
  DE: { code: 'DE', slug: 'delaware',       name: 'Delaware' },
  DC: { code: 'DC', slug: 'dc',             name: 'District of Columbia' },
  FL: { code: 'FL', slug: 'florida',        name: 'Florida' },
  GA: { code: 'GA', slug: 'georgia',        name: 'Georgia' },
  HI: { code: 'HI', slug: 'hawaii',         name: 'Hawaii' },
  ID: { code: 'ID', slug: 'idaho',          name: 'Idaho' },
  IL: { code: 'IL', slug: 'illinois',       name: 'Illinois' },
  IN: { code: 'IN', slug: 'indiana',        name: 'Indiana' },
  IA: { code: 'IA', slug: 'iowa',           name: 'Iowa' },
  KS: { code: 'KS', slug: 'kansas',         name: 'Kansas' },
  KY: { code: 'KY', slug: 'kentucky',       name: 'Kentucky' },
  LA: { code: 'LA', slug: 'louisiana',      name: 'Louisiana' },
  ME: { code: 'ME', slug: 'maine',          name: 'Maine' },
  MD: { code: 'MD', slug: 'maryland',       name: 'Maryland' },
  MA: { code: 'MA', slug: 'massachusetts',  name: 'Massachusetts' },
  MI: { code: 'MI', slug: 'michigan',       name: 'Michigan' },
  MN: { code: 'MN', slug: 'minnesota',      name: 'Minnesota' },
  MS: { code: 'MS', slug: 'mississippi',    name: 'Mississippi' },
  MO: { code: 'MO', slug: 'missouri',       name: 'Missouri' },
  MT: { code: 'MT', slug: 'montana',        name: 'Montana' },
  NE: { code: 'NE', slug: 'nebraska',       name: 'Nebraska' },
  NV: { code: 'NV', slug: 'nevada',         name: 'Nevada' },
  NH: { code: 'NH', slug: 'new-hampshire',  name: 'New Hampshire' },
  NJ: { code: 'NJ', slug: 'new-jersey',     name: 'New Jersey' },
  NM: { code: 'NM', slug: 'new-mexico',     name: 'New Mexico' },
  NY: { code: 'NY', slug: 'new-york',       name: 'New York' },
  NC: { code: 'NC', slug: 'north-carolina', name: 'North Carolina' },
  ND: { code: 'ND', slug: 'north-dakota',   name: 'North Dakota' },
  OH: { code: 'OH', slug: 'ohio',           name: 'Ohio' },
  OK: { code: 'OK', slug: 'oklahoma',       name: 'Oklahoma' },
  OR: { code: 'OR', slug: 'oregon',         name: 'Oregon' },
  PA: { code: 'PA', slug: 'pennsylvania',   name: 'Pennsylvania' },
  RI: { code: 'RI', slug: 'rhode-island',   name: 'Rhode Island' },
  SC: { code: 'SC', slug: 'south-carolina', name: 'South Carolina' },
  SD: { code: 'SD', slug: 'south-dakota',   name: 'South Dakota' },
  TN: { code: 'TN', slug: 'tennessee',      name: 'Tennessee' },
  TX: { code: 'TX', slug: 'texas',          name: 'Texas' },
  UT: { code: 'UT', slug: 'utah',           name: 'Utah' },
  VT: { code: 'VT', slug: 'vermont',        name: 'Vermont' },
  VA: { code: 'VA', slug: 'virginia',       name: 'Virginia' },
  WA: { code: 'WA', slug: 'washington',     name: 'Washington' },
  WV: { code: 'WV', slug: 'west-virginia',  name: 'West Virginia' },
  WI: { code: 'WI', slug: 'wisconsin',      name: 'Wisconsin' },
  WY: { code: 'WY', slug: 'wyoming',        name: 'Wyoming' },
})

export function stateNameFor(code: string): string {
  return STATES_BY_USPS[code]?.name ?? code
}

export function stateSlugFor(code: string): string | null {
  return STATES_BY_USPS[code]?.slug ?? null
}
