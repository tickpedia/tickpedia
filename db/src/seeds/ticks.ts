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

export const CANONICAL_TICKS: CanonicalTick[] = [
  {
    slug: 'ixodes-scapularis',
    commonName: 'Black-legged tick',
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
    slug: 'ixodes-pacificus',
    commonName: 'Western black-legged tick',
    scientificName: 'Ixodes pacificus',
    dangerLevel: 'high',
    diseases: ['Lyme disease', 'Anaplasmosis'],
  },
  {
    slug: 'amblyomma-americanum',
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
    slug: 'dermacentor-variabilis',
    commonName: 'American dog tick',
    scientificName: 'Dermacentor variabilis',
    dangerLevel: 'medium',
    diseases: ['Spotted fever rickettsiosis', 'Tularemia'],
  },
  {
    slug: 'dermacentor-andersoni',
    commonName: 'Rocky Mountain wood tick',
    scientificName: 'Dermacentor andersoni',
    dangerLevel: 'medium',
    diseases: ['Spotted fever rickettsiosis', 'Tularemia'],
  },
  {
    slug: 'rhipicephalus-sanguineus',
    commonName: 'Brown dog tick',
    scientificName: 'Rhipicephalus sanguineus',
    dangerLevel: 'medium',
    diseases: ['Spotted fever rickettsiosis'],
  },
]
