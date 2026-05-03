// Canonical Ixodes-borne pathogens.
//
// CDC's "Public Use Ixodes Pathogens County Table" tracks per-county
// presence for these seven. Aliases include the column-header variants
// CDC ships with (case + underscores ignored at lookup time, but listed
// here verbatim so a `slugify(header)` resolves to a row). One-liners
// are short factual blurbs so the pathogen lens has SEO-grade copy on
// day one.
//
// `diseases` and `ticks` are slug arrays consumed by the seed step,
// which inserts join rows into `disease_pathogens` and `tick_pathogens`
// respectively. The seed lookup is resilient: missing slugs are
// silently skipped (e.g. `borrelia-miyamotoi-disease` lives in the
// editorial JSON content, not the base seed — so on a fresh
// `db:seed`, the B. miyamotoi join row is absent until the user runs
// the JSON content import and re-runs `db:seed`).
//
// Source: cdc.gov/ticks/data-research/facts-stats/tick-surveillance-data-sets.html

export interface CanonicalPathogen {
  slug: string
  displayName: string
  scientificName: string
  oneLiner: string
  aliases: string[]
  /** Disease slugs this pathogen causes. Resolved at seed time. */
  diseases: string[]
  /** Tick slugs known to carry this pathogen. Resolved at seed time. */
  ticks: string[]
}

export const CANONICAL_PATHOGENS: CanonicalPathogen[] = [
  {
    slug: 'borrelia-burgdorferi',
    displayName: 'Borrelia burgdorferi',
    scientificName: 'Borrelia burgdorferi sensu stricto',
    oneLiner:
      'Spirochete that causes Lyme disease in the eastern US (carried by Ixodes scapularis) and on the west coast (carried by Ixodes pacificus).',
    aliases: [
      'borrelia-burgdorferi-sensu-stricto',
      'borrelia-burgdorferi',
      'b-burgdorferi',
    ],
    diseases: ['lyme-disease'],
    ticks: ['blacklegged-tick', 'western-blacklegged-tick'],
  },
  {
    slug: 'borrelia-mayonii',
    displayName: 'Borrelia mayonii',
    scientificName: 'Borrelia mayonii',
    oneLiner:
      'Lyme-disease-causing spirochete first identified in 2013 in upper-midwest deer ticks; produces a distinctive diffuse rash and high spirochetal load.',
    aliases: ['borrelia-mayonii', 'b-mayonii'],
    diseases: ['lyme-disease'],
    ticks: ['blacklegged-tick'],
  },
  {
    slug: 'borrelia-miyamotoi',
    displayName: 'Borrelia miyamotoi',
    scientificName: 'Borrelia miyamotoi',
    oneLiner:
      'Relapsing-fever spirochete carried by Ixodes ticks; causes hard-tick relapsing fever (HTRF) — fever, headache, myalgia without the Lyme bullseye rash.',
    aliases: ['borrelia-miyamotoi', 'b-miyamotoi'],
    // borrelia-miyamotoi-disease is a JSON-content disease, not in the
    // base seed. The seed lookup is resilient — this join row only
    // lands after the JSON content import + a re-run of `db:seed`.
    diseases: ['borrelia-miyamotoi-disease'],
    ticks: ['blacklegged-tick'],
  },
  {
    slug: 'anaplasma-phagocytophilum',
    displayName: 'Anaplasma phagocytophilum',
    scientificName: 'Anaplasma phagocytophilum',
    oneLiner:
      'Intracellular bacterium that causes anaplasmosis (formerly human granulocytic ehrlichiosis); carried by Ixodes scapularis and I. pacificus.',
    aliases: [
      'anaplasma-phagocytophilum',
      'anaplasma-phagocytophilum-human-active-variant',
      'a-phagocytophilum',
    ],
    diseases: ['anaplasmosis'],
    ticks: ['blacklegged-tick', 'western-blacklegged-tick'],
  },
  {
    slug: 'ehrlichia-muris-eauclairensis',
    displayName: 'Ehrlichia muris eauclairensis',
    scientificName: 'Ehrlichia muris eauclairensis',
    oneLiner:
      'Upper-midwest Ehrlichia variant first identified in Wisconsin/Minnesota in 2009; causes a fever-and-headache illness similar to other ehrlichioses.',
    aliases: [
      'ehrlichia-muris-eauclairensis',
      'ehrlichia-muris',
      'eml',
    ],
    // EME has its own disease entry in the editorial JSON content
    // (`ehrlichia-muris-eauclairensis-ehrlichiosis`). It's not in the
    // base seed — the join only resolves after the JSON content
    // import lands and `db:seed` is re-run.
    diseases: ['ehrlichia-muris-eauclairensis-ehrlichiosis'],
    ticks: ['blacklegged-tick'],
  },
  {
    slug: 'babesia-microti',
    displayName: 'Babesia microti',
    scientificName: 'Babesia microti',
    oneLiner:
      'Malaria-like protozoan that infects red blood cells; the dominant cause of human babesiosis in the northeastern and upper-midwest US.',
    aliases: ['babesia-microti', 'b-microti'],
    diseases: ['babesiosis'],
    ticks: ['blacklegged-tick'],
  },
  {
    slug: 'powassan-virus',
    displayName: 'Powassan virus',
    scientificName: 'Powassan virus',
    oneLiner:
      'Tick-borne flavivirus transmitted by Ixodes scapularis (deer tick virus, lineage II) and I. cookei; causes severe encephalitis with high case fatality.',
    aliases: ['powassan-virus', 'powv', 'deer-tick-virus', 'dtv'],
    diseases: ['powassan-virus'],
    ticks: ['blacklegged-tick'],
  },
]
