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
//   * Be liberal with `searchable`. Storage is cheap, and "I typed
//     'Massachusetts'" / "I typed 'Essex'" / "I typed 'lyme'" should
//     all surface the right rows. Numeric / FK columns stay
//     query-only.
//   * Every lens has a single `id` primary key. For surveillance
//     tables that conceptually key on a tuple (tick_state on
//     `(tick_id, state_fips)`, tick_county on
//     `(tick_id, county_fips, year)`, etc.) we add a surrogate
//     `serial id` and enforce the natural tuple as a unique index in
//     db/src/schema.ts. Single-PK lenses are the path of least
//     surprise for SemiLayer relations and feed cursors.
//   * Three layers keep the index honest:
//       1. `changeTrackingColumn: 'updatedAt'` + a tight
//          `syncInterval` (5m editorial, 15m surveillance) for
//          incremental pulls on a cron.
//       2. `smartSyncInterval: '24h'` for a daily full-source scan
//          that hash-dedups and tombstones deleted rows. Catches
//          DELETEs that incremental misses (incremental only sees
//          updated_at changes — a row that vanished doesn't update
//          anything).
//       3. App-level push: the admin's server actions in
//          apps/admin/src/lib/semilayer-notify.ts POST
//          `{"mode":"incremental"}` to `/v1/ingest/<lens>` after a
//          successful write. The worker debounces ~5s and pulls.
//     So a write lands embedded within seconds (layer 3); a deletion
//     gets reconciled within 24h (layer 2); and a missed webhook is
//     caught on the next 5/15m tick (layer 1).
//   * `relations` declare joins so callers can use `include` clauses
//     (e.g. `beam.ticks.query({ include: { wildFacts: true } })`).
//     Relation `on` is `{ [localField]: foreignField }` — both sides
//     use the *mapped* field names, not the source columns.
//   * `feeds.relatedTo` is the conventional "more like this" feed —
//     similarity ranking against the seed row's stored embedding (zero
//     embed cost via `mode: 'recordVector'`). Only worth adding to
//     lenses with searchable fields, since it needs an embedding to
//     compare against.
//   * `feeds.latest` ranks by recency on `changeTrackingColumn`. Use
//     it for "what's new" homepage rails — wild facts, recently-
//     updated removal techniques, etc.
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
        slug: { type: 'text', searchable: true },
        commonName: { type: 'text', from: 'common_name', searchable: { weight: 3 } },
        scientificName: { type: 'text', from: 'scientific_name', searchable: { weight: 2 } },
        heroPhotoUrl: { type: 'text', from: 'hero_photo_url' },
        dangerLevel: { type: 'text', from: 'danger_level', searchable: true },
        diseases: { type: 'text', array: true, searchable: { weight: 2 } },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      changeTrackingColumn: 'updatedAt',
      syncInterval: '5m',
      smartSyncInterval: '24h',
      relations: {
        wildFacts: { lens: 'wildFacts', kind: 'hasMany', on: { id: 'tickId' }, defaultIncludeLimit: 10 },
        states: { lens: 'tickState', kind: 'hasMany', on: { id: 'tickId' }, defaultIncludeLimit: 100 },
        counties: { lens: 'tickCounty', kind: 'hasMany', on: { id: 'tickId' }, defaultIncludeLimit: 5000 },
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
        body: { type: 'text', searchable: { weight: 2 } },
        citationUrl: { type: 'text', from: 'citation_url' },
        tickId: { type: 'number', from: 'tick_id' },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      changeTrackingColumn: 'updatedAt',
      syncInterval: '5m',
      smartSyncInterval: '24h',
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
        similar: 'public',
        query: 'public',
        feed: { latest: 'public', relatedTo: 'public' },
      },
    },

    removalTechniques: {
      source: 'main',
      table: 'removal_techniques',
      fields: {
        id: { type: 'number', primaryKey: true },
        slug: { type: 'text', searchable: true },
        title: { type: 'text', searchable: { weight: 3 } },
        steps: { type: 'text', searchable: { weight: 2 } },
        sourceUrl: { type: 'text', from: 'source_url' },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      changeTrackingColumn: 'updatedAt',
      syncInterval: '5m',
      smartSyncInterval: '24h',
      feeds: {
        latest: {
          candidates: { from: 'recent', limit: 50 },
          rank: { recency: { weight: 1, halfLife: '30d' } },
          pagination: { pageSize: 10, dedup: { by: 'sourceRowId' } },
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
        similar: 'public',
        query: 'public',
        feed: { latest: 'public', relatedTo: 'public' },
      },
    },

    // ─── Geography (now searchable so "Maine" / "Essex" work) ────────
    states: {
      source: 'main',
      table: 'states',
      fields: {
        fips: { type: 'text', primaryKey: true },
        code: { type: 'text', searchable: true },
        slug: { type: 'text', searchable: true },
        name: { type: 'text', searchable: { weight: 3 } },
      },
      relations: {
        counties: { lens: 'counties', kind: 'hasMany', on: { fips: 'stateFips' }, defaultIncludeLimit: 1000 },
        ticks: { lens: 'tickState', kind: 'hasMany', on: { fips: 'stateFips' }, defaultIncludeLimit: 50 },
      },
      grants: { search: 'public', query: 'public' },
    },

    counties: {
      source: 'main',
      table: 'counties',
      fields: {
        fips: { type: 'text', primaryKey: true },
        stateFips: { type: 'text', from: 'state_fips' },
        countyName: { type: 'text', from: 'county_name', searchable: { weight: 3 } },
        slug: { type: 'text', searchable: true },
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
      grants: { search: 'public', query: 'public' },
    },

    // ─── Diseases (now searchable on slug + display + aliases) ──────
    diseases: {
      source: 'main',
      table: 'diseases',
      changeTrackingColumn: 'updatedAt',
      syncInterval: '5m',
      smartSyncInterval: '24h',
      fields: {
        id: { type: 'number', primaryKey: true },
        slug: { type: 'text', searchable: true },
        displayName: { type: 'text', from: 'display_name', searchable: { weight: 3 } },
        aliases: { type: 'text', array: true, searchable: { weight: 2 } },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
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

    // ─── Joins / surveillance (numeric — query-only, but tickCounty
    //     gets searchable status so users can find "established"
    //     counties via search) ──────────────────────────────────────
    tickState: {
      source: 'main',
      table: 'tick_state',
      changeTrackingColumn: 'updatedAt',
      syncInterval: '15m',
      smartSyncInterval: '24h',
      fields: {
        id: { type: 'number', primaryKey: true },
        tickId: { type: 'number', from: 'tick_id' },
        stateFips: { type: 'text', from: 'state_fips' },
        prevalence: { type: 'text' },
        peakMonths: { type: 'number', array: true, from: 'peak_months' },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      relations: {
        tick: { lens: 'ticks', kind: 'belongsTo', on: { tickId: 'id' } },
        state: { lens: 'states', kind: 'belongsTo', on: { stateFips: 'fips' } },
      },
      grants: { query: 'public' },
    },

    tickCounty: {
      source: 'main',
      table: 'tick_county',
      changeTrackingColumn: 'updatedAt',
      syncInterval: '15m',
      smartSyncInterval: '24h',
      fields: {
        id: { type: 'number', primaryKey: true },
        tickId: { type: 'number', from: 'tick_id' },
        countyFips: { type: 'text', from: 'county_fips' },
        year: { type: 'number' },
        status: { type: 'text', searchable: true },
        source: { type: 'text', searchable: true },
        sourceComments: { type: 'text', from: 'source_comments', searchable: true },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      relations: {
        tick: { lens: 'ticks', kind: 'belongsTo', on: { tickId: 'id' } },
        county: { lens: 'counties', kind: 'belongsTo', on: { countyFips: 'fips' } },
      },
      feeds: {
        latest: {
          candidates: { from: 'recent', limit: 200 },
          rank: { recency: { weight: 1, halfLife: '30d' } },
          pagination: { pageSize: 50, dedup: { by: 'sourceRowId' } },
        },
      },
      grants: {
        search: 'public',
        query: 'public',
        feed: { latest: 'public' },
      },
    },

    diseaseCountyYear: {
      source: 'main',
      table: 'disease_county_year',
      changeTrackingColumn: 'updatedAt',
      syncInterval: '15m',
      smartSyncInterval: '24h',
      fields: {
        id: { type: 'number', primaryKey: true },
        countyFips: { type: 'text', from: 'county_fips' },
        diseaseId: { type: 'number', from: 'disease_id' },
        year: { type: 'number' },
        count: { type: 'number' },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
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
      changeTrackingColumn: 'updatedAt',
      syncInterval: '15m',
      smartSyncInterval: '24h',
      fields: {
        id: { type: 'number', primaryKey: true },
        year: { type: 'number' },
        month: { type: 'number' },
        diseaseId: { type: 'number', from: 'disease_id' },
        count: { type: 'number' },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      relations: {
        disease: { lens: 'diseases', kind: 'belongsTo', on: { diseaseId: 'id' } },
      },
      grants: { query: 'public' },
    },
  },
})
