// Canonical ticks. Slug + scientific_name are the natural keys an
// importer uses to resolve a row. Add a tick here when CDC starts
// reporting it as its own surveillance row.

export interface CanonicalTick {
  slug: string
  commonName: string
  scientificName: string
  dangerLevel: 'low' | 'medium' | 'high'
  diseases: string[]
}

// Canonical slugs use the human-English common name (e.g.
// 'blacklegged-tick'); scientific-name slugs ('ixodes-scapularis')
// are alias-redirects per `apps/web/src/aliases.ts`.

export const CANONICAL_TICKS: CanonicalTick[] = [
  {
    slug: 'blacklegged-tick',
    commonName: 'Blacklegged tick',
    scientificName: 'Ixodes scapularis',
    dangerLevel: 'high',
    diseases: [
      'Lyme disease',
      'Babesiosis',
      'Anaplasmosis',
      'Powassan virus disease',
    ],
  },
  {
    slug: 'western-blacklegged-tick',
    commonName: 'Western blacklegged tick',
    scientificName: 'Ixodes pacificus',
    dangerLevel: 'high',
    diseases: ['Lyme disease', 'Anaplasmosis'],
  },
  {
    slug: 'lone-star-tick',
    commonName: 'Lone star tick',
    scientificName: 'Amblyomma americanum',
    dangerLevel: 'high',
    diseases: [
      'Ehrlichia chaffeensis ehrlichiosis',
      'Ehrlichia ewingii ehrlichiosis',
      'Tularemia',
      'Alpha-gal syndrome',
    ],
  },
  {
    slug: 'american-dog-tick',
    commonName: 'American dog tick',
    scientificName: 'Dermacentor variabilis',
    dangerLevel: 'medium',
    diseases: ['Spotted fever rickettsiosis', 'Tularemia'],
  },
  {
    slug: 'rocky-mountain-wood-tick',
    commonName: 'Rocky Mountain wood tick',
    scientificName: 'Dermacentor andersoni',
    dangerLevel: 'medium',
    diseases: ['Spotted fever rickettsiosis', 'Tularemia'],
  },
  {
    slug: 'brown-dog-tick',
    commonName: 'Brown dog tick',
    scientificName: 'Rhipicephalus sanguineus',
    dangerLevel: 'medium',
    diseases: ['Spotted fever rickettsiosis'],
  },
]
