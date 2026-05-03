import { MetaPage } from './MetaPage.js'

// /sources — every external dataset and primary reference that feeds
// Tickpedia. Grouped by domain. Linked. The list lives in code (not
// a CMS) so it's reviewable in the diff.

interface SourceEntry {
  name: string
  url: string
  what: string
}

interface SourceGroup {
  heading: string
  blurb: string
  entries: SourceEntry[]
}

const SOURCE_GROUPS: SourceGroup[] = [
  {
    heading: 'CDC — surveillance + species-level facts',
    blurb:
      'The Centers for Disease Control and Prevention is the primary source for tick species range, pathogen detection, and disease case counts at the state and county level.',
    entries: [
      {
        name: 'CDC Tick Surveillance Datasets',
        url: 'https://www.cdc.gov/ticks/data-research/facts-stats/tick-surveillance-data-sets.html',
        what: 'Per-county established-vs-reported records for Ixodes scapularis, Amblyomma americanum, and several other vectors.',
      },
      {
        name: 'CDC Tickborne Diseases of the United States',
        url: 'https://www.cdc.gov/ticks/about/index.html',
        what: 'Authoritative summaries on Lyme, anaplasmosis, babesiosis, RMSF, ehrlichiosis, alpha-gal, Powassan, and more.',
      },
      {
        name: 'CDC Notifiable Diseases Surveillance (NNDSS)',
        url: 'https://www.cdc.gov/nndss/index.html',
        what: 'Annual case counts by disease and state, going back several decades.',
      },
      {
        name: 'CDC Public Use Ixodes Pathogens County Table',
        url: 'https://www.cdc.gov/ticks/data-research/facts-stats/tick-surveillance-data-sets.html',
        what: 'Per-county presence/absence for the seven Ixodes-borne pathogens — Borrelia burgdorferi, B. mayonii, B. miyamotoi, Anaplasma phagocytophilum, Ehrlichia muris eauclairensis, Babesia microti, Powassan virus.',
      },
    ],
  },
  {
    heading: 'US Census Bureau — geography',
    blurb:
      'County boundaries, FIPS codes, and centroid coordinates for the 3,143 US counties + DC + territories.',
    entries: [
      {
        name: 'Census Gazetteer Files (Counties)',
        url: 'https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html',
        what: 'Authoritative latitude / longitude centroids; powers the schema.org `Place` blocks on county pages.',
      },
      {
        name: 'FCC FIPS Code File',
        url: 'https://transition.fcc.gov/oet/info/maps/census/fips/fips.txt',
        what: 'County name + FIPS lookup table used to seed the `counties` table.',
      },
    ],
  },
  {
    heading: 'Editorial + secondary references',
    blurb:
      'When primary surveillance data is silent, Tickpedia uses peer-reviewed sources for natural history, scientific synonymy, and removal technique evidence.',
    entries: [
      {
        name: 'Integrated Taxonomic Information System (ITIS)',
        url: 'https://www.itis.gov/',
        what: 'Authoritative source for scientific name + taxonomy of every tick species.',
      },
      {
        name: 'NCBI PubMed',
        url: 'https://pubmed.ncbi.nlm.nih.gov/',
        what: 'Citation backbone for removal-technique evidence and pathogen biology.',
      },
      {
        name: 'CDC Tick Removal',
        url: 'https://www.cdc.gov/ticks/removing-a-tick/index.html',
        what: 'Reference on the fine-tipped tweezers technique.',
      },
    ],
  },
  {
    heading: 'This project',
    blurb:
      'The editorial layer (one-liners, removal-step copy, wild facts, the URL contract) is written by the contributors listed in the GitHub repo. Every claim that is not a raw surveillance count carries a citation; if you find one that does not, please flag it.',
    entries: [
      {
        name: 'github.com/tickpedia/tickpedia',
        url: 'https://github.com/tickpedia/tickpedia',
        what: 'Source code, schema, editorial JSON, and issue tracker.',
      },
      {
        name: 'github.com/tickpedia/plan',
        url: 'https://github.com/tickpedia/plan',
        what: 'Public roadmap, design briefs, and per-step decision log.',
      },
    ],
  },
]

export function SourcesPage() {
  return (
    <MetaPage
      title="Sources"
      eyebrow="Citations + datasets"
      lede="Every claim on Tickpedia traces to public surveillance data, government geography files, or the peer-reviewed literature. Here is the full list."
      canonicalPath="/sources"
      active="sources"
    >
      {SOURCE_GROUPS.map((group) => (
        <section className="tp-section" key={group.heading}>
          <h2 className="tp-serif">{group.heading}</h2>
          <p>{group.blurb}</p>
          <ul className="tp-source-list">
            {group.entries.map((entry) => (
              <li key={entry.url}>
                <a href={entry.url} rel="noreferrer">
                  {entry.name}
                </a>
                <span className="ui meta">— {entry.what}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </MetaPage>
  )
}
