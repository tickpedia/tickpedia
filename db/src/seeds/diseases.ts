// Canonical CDC tick-borne diseases. Aliases capture the casing /
// punctuation variants we see in raw downloads. Add to this list when
// CDC starts reporting a new condition.
//
// Source: https://www.cdc.gov/ticks/data-research/facts-stats/index.html

export interface CanonicalDisease {
  slug: string
  displayName: string
  aliases: string[]
}

export const CANONICAL_DISEASES: CanonicalDisease[] = [
  {
    slug: 'lyme-disease',
    displayName: 'Lyme disease',
    aliases: ['lyme', 'lyme-disease'],
  },
  {
    slug: 'anaplasmosis',
    displayName: 'Anaplasmosis',
    aliases: ['anaplasmosis', 'human-granulocytic-anaplasmosis', 'hga'],
  },
  {
    slug: 'babesiosis',
    displayName: 'Babesiosis',
    aliases: ['babesiosis'],
  },
  {
    slug: 'ehrlichia-chaffeensis-ehrlichiosis',
    displayName: 'Ehrlichia chaffeensis ehrlichiosis',
    aliases: [
      'ehrlichia-chaffeensis-ehrlichiosis',
      'e-chaffeensis-ehrlichiosis',
      'ehrlichiosis-e-chaffeensis',
      'human-monocytic-ehrlichiosis',
      'hme',
    ],
  },
  {
    slug: 'ehrlichia-ewingii-ehrlichiosis',
    displayName: 'Ehrlichia ewingii ehrlichiosis',
    aliases: [
      'ehrlichia-ewingii-ehrlichiosis',
      'e-ewingii-ehrlichiosis',
      'ehrlichiosis-e-ewingii',
    ],
  },
  {
    slug: 'spotted-fever-rickettsiosis',
    displayName: 'Spotted fever rickettsiosis',
    aliases: [
      'spotted-fever-rickettsiosis',
      'spotted-fever',
      'rocky-mountain-spotted-fever',
      'rmsf',
    ],
  },
  {
    slug: 'tularemia',
    displayName: 'Tularemia',
    aliases: ['tularemia'],
  },
  {
    slug: 'undetermined-ehrlichiosis-anaplasmosis',
    displayName: 'Undetermined ehrlichiosis/anaplasmosis',
    aliases: [
      'undetermined-ehrlichiosis-anaplasmosis',
      'undetermined-ehrlichiosis-or-anaplasmosis',
      'ehrlichiosis-anaplasmosis-undetermined',
    ],
  },
  {
    slug: 'powassan-virus',
    displayName: 'Powassan virus disease',
    aliases: ['powassan', 'powassan-virus', 'powassan-virus-disease', 'pow'],
  },
  {
    slug: 'alpha-gal-syndrome',
    displayName: 'Alpha-gal syndrome',
    aliases: ['alpha-gal-syndrome', 'alpha-gal', 'ags', 'mammalian-meat-allergy'],
  },
]
