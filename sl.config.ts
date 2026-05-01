import { defineConfig } from '@semilayer/core'

// SemiLayer config for Tickpedia.
//
//   org:     tickpedia
//   project: web        (== `stack` below)
//   env:     prod
//   source:  main       (Postgres bridge → Neon)
//
// Lens design:
//
//   * Only fields worth embedding are `searchable`. Lookup tables
//     (states / counties / diseases) are query-only.
//   * Composite-PK tables (tick_state, disease_county_year, disease_month)
//     have a surrogate `id` column because SemiLayer requires exactly one
//     primary-key field per lens. The natural keys are unique indexes in
//     db/src/schema.ts.
//   * `relations` declare joins so callers can use `include` clauses
//     (e.g. `beam.ticks.query({ include: { wildFacts: true } })`).
//     Relation `on` is `{ [localField]: foreignField }` — both sides use
//     the *mapped* field names, not the source columns.
//   * `feeds.relatedTo` is the conventional "more like this" feed —
//     similarity ranking against the seed row's stored embedding (zero
//     embed cost via `mode: 'recordVector'`).
//
// After editing:
//   pnpm semilayer:push        # apply to the SemiLayer service
//   pnpm semilayer:generate    # regenerate ./generated/semilayer

export default defineConfig({
  stack: 'web',
  sources: {
    main: {
      bridge: '@semilayer/bridge-postgres',
    },
  },
  lenses: {
    // ─── Tickpedia core (search-worthy) ─────────────────────────────
    ticks: {
      source: 'main',
      table: 'ticks',
      fields: {
        id: { type: 'number', primaryKey: true },
        slug: { type: 'text' },
        commonName: { type: 'text', from: 'common_name', searchable: { weight: 2 } },
        scientificName: { type: 'text', from: 'scientific_name', searchable: true },
        heroPhotoUrl: { type: 'text', from: 'hero_photo_url' },
        dangerLevel: { type: 'text', from: 'danger_level' },
        diseases: { type: 'text', array: true, searchable: true },
      },
      relations: {
        wildFacts: { lens: 'wildFacts', kind: 'hasMany', on: { id: 'tickId' }, defaultIncludeLimit: 10 },
        states: { lens: 'tickState', kind: 'hasMany', on: { id: 'tickId' }, defaultIncludeLimit: 100 },
      },
      feeds: {
        relatedTo: {
          candidates: { from: 'embeddings' },
          rank: {
            similarity: {
              weight: 1,
              against: { from: 'context.seedRecordId', mode: 'recordVector' },
            },
          },
          pagination: { excludeIds: 'context.seedRecordId' },
        },
      },
      grants: {
        search: 'public',
        similar: 'public',
        query: 'public',
        feed: { relatedTo: 'public' },
      },
    },

    wildFacts: {
      source: 'main',
      table: 'wild_facts',
      fields: {
        id: { type: 'number', primaryKey: true },
        body: { type: 'text', searchable: true },
        citationUrl: { type: 'text', from: 'citation_url' },
        tickId: { type: 'number', from: 'tick_id' },
        createdAt: { type: 'date', from: 'created_at' },
      },
      changeTrackingColumn: 'createdAt',
      relations: {
        tick: { lens: 'ticks', kind: 'belongsTo', on: { tickId: 'id' } },
      },
      feeds: {
        latest: {
          candidates: { from: 'recent', limit: 100 },
          rank: { recency: { weight: 1, halfLife: '7d' } },
          pagination: { pageSize: 20, dedup: { by: 'sourceRowId' } },
        },
        relatedTo: {
          candidates: { from: 'embeddings' },
          rank: {
            similarity: {
              weight: 1,
              against: { from: 'context.seedRecordId', mode: 'recordVector' },
            },
          },
          pagination: { excludeIds: 'context.seedRecordId' },
        },
      },
      grants: {
        search: 'public',
        query: 'public',
        feed: { latest: 'public', relatedTo: 'public' },
      },
    },

    removalTechniques: {
      source: 'main',
      table: 'removal_techniques',
      fields: {
        id: { type: 'number', primaryKey: true },
        slug: { type: 'text' },
        title: { type: 'text', searchable: { weight: 2 } },
        steps: { type: 'text', searchable: true },
        sourceUrl: { type: 'text', from: 'source_url' },
      },
      grants: {
        search: 'public',
        query: 'public',
      },
    },

    // ─── Geography (query-only lookups) ──────────────────────────────
    states: {
      source: 'main',
      table: 'states',
      fields: {
        fips: { type: 'text', primaryKey: true },
        code: { type: 'text' },
        slug: { type: 'text' },
        name: { type: 'text' },
      },
      relations: {
        counties: { lens: 'counties', kind: 'hasMany', on: { fips: 'stateFips' }, defaultIncludeLimit: 1000 },
        ticks: { lens: 'tickState', kind: 'hasMany', on: { fips: 'stateFips' }, defaultIncludeLimit: 50 },
      },
      grants: { query: 'public' },
    },

    counties: {
      source: 'main',
      table: 'counties',
      fields: {
        fips: { type: 'text', primaryKey: true },
        stateFips: { type: 'text', from: 'state_fips' },
        countyName: { type: 'text', from: 'county_name' },
        slug: { type: 'text' },
      },
      relations: {
        state: { lens: 'states', kind: 'belongsTo', on: { stateFips: 'fips' } },
        diseaseStats: {
          lens: 'diseaseCountyYear',
          kind: 'hasMany',
          on: { fips: 'countyFips' },
          defaultIncludeLimit: 500,
        },
      },
      grants: { query: 'public' },
    },

    // ─── Diseases (small lookup) ─────────────────────────────────────
    diseases: {
      source: 'main',
      table: 'diseases',
      fields: {
        id: { type: 'number', primaryKey: true },
        slug: { type: 'text' },
        displayName: { type: 'text', from: 'display_name' },
        aliases: { type: 'text', array: true },
      },
      relations: {
        countyStats: {
          lens: 'diseaseCountyYear',
          kind: 'hasMany',
          on: { id: 'diseaseId' },
          defaultIncludeLimit: 1000,
        },
        monthlyStats: {
          lens: 'diseaseMonth',
          kind: 'hasMany',
          on: { id: 'diseaseId' },
          defaultIncludeLimit: 240, // ~20 years × 12 months
        },
      },
      grants: { query: 'public' },
    },

    // ─── Joins / surveillance (query-only, numeric) ──────────────────
    tickState: {
      source: 'main',
      table: 'tick_state',
      fields: {
        id: { type: 'number', primaryKey: true },
        tickId: { type: 'number', from: 'tick_id' },
        stateFips: { type: 'text', from: 'state_fips' },
        prevalence: { type: 'text' },
        peakMonths: { type: 'number', array: true, from: 'peak_months' },
      },
      relations: {
        tick: { lens: 'ticks', kind: 'belongsTo', on: { tickId: 'id' } },
        state: { lens: 'states', kind: 'belongsTo', on: { stateFips: 'fips' } },
      },
      grants: { query: 'public' },
    },

    diseaseCountyYear: {
      source: 'main',
      table: 'disease_county_year',
      fields: {
        id: { type: 'number', primaryKey: true },
        countyFips: { type: 'text', from: 'county_fips' },
        diseaseId: { type: 'number', from: 'disease_id' },
        year: { type: 'number' },
        count: { type: 'number' },
      },
      relations: {
        county: { lens: 'counties', kind: 'belongsTo', on: { countyFips: 'fips' } },
        disease: { lens: 'diseases', kind: 'belongsTo', on: { diseaseId: 'id' } },
      },
      grants: { query: 'public' },
    },

    diseaseMonth: {
      source: 'main',
      table: 'disease_month',
      fields: {
        id: { type: 'number', primaryKey: true },
        year: { type: 'number' },
        month: { type: 'number' },
        diseaseId: { type: 'number', from: 'disease_id' },
        count: { type: 'number' },
      },
      relations: {
        disease: { lens: 'diseases', kind: 'belongsTo', on: { diseaseId: 'id' } },
      },
      grants: { query: 'public' },
    },
  },
})
