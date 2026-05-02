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
        oneLiner: { type: 'text', from: 'one_liner', searchable: { weight: 2 } },
        heroPhotoUrl: { type: 'text', from: 'hero_photo_url' },
        heroHeadColor: { type: 'text', from: 'hero_head_color' },
        heroBodyColor: { type: 'text', from: 'hero_body_color' },
        heroLegColor: { type: 'text', from: 'hero_leg_color' },
        dangerLevel: { type: 'text', from: 'danger_level', searchable: true },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      changeTrackingColumn: 'updatedAt',
      syncInterval: '5m',
      smartSyncInterval: '24h',
      // M:N joins surface as their own lenses (tickDiseases, etc.) so a
      // caller chains: ticks → diseaseRefs → disease. The join lens
      // carries `belongsTo` to both sides, so the typed include works
      // both directions without a `hasManyThrough` macro.
      relations: {
        diseaseRefs: { lens: 'tickDiseases', kind: 'hasMany', on: { id: 'tickId' }, defaultIncludeLimit: 50 },
        removalTechniqueRefs: { lens: 'tickRemovalTechniques', kind: 'hasMany', on: { id: 'tickId' }, defaultIncludeLimit: 50 },
        wildFactRefs: { lens: 'wildFactTicks', kind: 'hasMany', on: { id: 'tickId' }, defaultIncludeLimit: 50 },
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
        slug: { type: 'text', searchable: true },
        body: { type: 'text', searchable: { weight: 2 } },
        citationUrl: { type: 'text', from: 'citation_url' },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      changeTrackingColumn: 'updatedAt',
      syncInterval: '5m',
      smartSyncInterval: '24h',
      relations: {
        tickRefs: { lens: 'wildFactTicks', kind: 'hasMany', on: { id: 'wildFactId' }, defaultIncludeLimit: 20 },
        diseaseRefs: { lens: 'wildFactDiseases', kind: 'hasMany', on: { id: 'wildFactId' }, defaultIncludeLimit: 20 },
        removalTechniqueRefs: { lens: 'wildFactRemovalTechniques', kind: 'hasMany', on: { id: 'wildFactId' }, defaultIncludeLimit: 20 },
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
        oneLiner: { type: 'text', from: 'one_liner', searchable: { weight: 2 } },
        steps: { type: 'text', searchable: { weight: 2 } },
        sourceUrl: { type: 'text', from: 'source_url' },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      changeTrackingColumn: 'updatedAt',
      syncInterval: '5m',
      smartSyncInterval: '24h',
      relations: {
        tickRefs: { lens: 'tickRemovalTechniques', kind: 'hasMany', on: { id: 'removalTechniqueId' }, defaultIncludeLimit: 50 },
        wildFactRefs: { lens: 'wildFactRemovalTechniques', kind: 'hasMany', on: { id: 'removalTechniqueId' }, defaultIncludeLimit: 50 },
      },
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
        // Census internal-point centroid. Hopped via the diseaseCountyYear
        // / tickCounty `county` relations to power H3-bucketed heatmaps.
        latitude: { type: 'number' },
        longitude: { type: 'number' },
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
      feeds: {
        // Counties ranked by cumulative tick-borne disease load. Powers
        // /counties?sort=risk without a custom query. Engagement aggregates
        // over all reports (no SemiLayer window token large enough for
        // yearly CDC data; linear decay keeps older years quieter).
        byDiseaseLoad: {
          // counties is static FIPS data with no change-tracking column,
          // so the candidate pool comes from the embeddings index (every
          // county has an embedding via its searchable countyName + slug).
          // Engagement then ranks by cumulative CDC report count.
          candidates: { from: 'embeddings', limit: 5000 },
          rank: {
            engagement: {
              weight: 1,
              lens: 'diseaseCountyYear',
              relation: 'diseaseStats',
              aggregate: 'sum',
              column: 'count',
              decay: 'linear',
            },
          },
          pagination: { pageSize: 50 },
        },
      },
      grants: {
        search: 'public',
        query: 'public',
        feed: { byDiseaseLoad: 'public' },
      },
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
        tickRefs: { lens: 'tickDiseases', kind: 'hasMany', on: { id: 'diseaseId' }, defaultIncludeLimit: 50 },
        wildFactRefs: { lens: 'wildFactDiseases', kind: 'hasMany', on: { id: 'diseaseId' }, defaultIncludeLimit: 50 },
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
        // "Diseases on the rise" — engagement = sum of CDC report counts
        // through the disease's countyStats relation. Linear decay
        // attenuates older years so a 1995 spike doesn't bury a current
        // surge; the engagement is unwindowed because CDC drops are
        // yearly and short windows would zero out most of the signal.
        trending: {
          candidates: { from: 'recent', limit: 200 },
          rank: {
            engagement: {
              weight: 1,
              lens: 'diseaseCountyYear',
              relation: 'countyStats',
              aggregate: 'sum',
              column: 'count',
              decay: 'linear',
            },
          },
          pagination: { pageSize: 10, dedup: { by: 'sourceRowId' } },
        },
      },
      analyses: {
        // Editorial: how stale is each disease's surveillance data?
        // Tiny lens (~20 diseases), no precompute. Ungranted on purpose
        // — admin-server-only via the service key.
        recencyOfData: {
          candidates: {},
          dimensions: [{ field: 'id' }],
          measures: {
            lastImport: { agg: 'max', column: 'updatedAt' },
          },
        },
      },
      grants: {
        search: 'public',
        similar: 'public',
        query: 'public',
        feed: { relatedTo: 'public', trending: 'public' },
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
        // "Counties where this tick just flipped to established." News
        // ticker for the tick-spread page. CDC drops are yearly, so the
        // recency decay mostly orders rows imported in the same week.
        recentlyEstablished: {
          candidates: { from: 'recent', limit: 500, where: { status: 'established' } },
          rank: { recency: { weight: 1, halfLife: '30d' } },
          pagination: { pageSize: 30, dedup: { by: 'sourceRowId' } },
        },
      },
      analyses: {
        // "Established in N counties" badge on /ticks/[slug]. Distinct
        // count of countyFips, scoped to established rows only.
        // Precomputed because the source lens is large; CDC imports
        // invalidate the rollup so reads stay fresh.
        establishedRange: {
          candidates: { where: { status: 'established' } },
          dimensions: [{ field: 'tickId' }],
          measures: {
            counties: { agg: 'count_distinct', column: 'countyFips' },
          },
          precompute: { onlyAdditive: true, refreshInterval: '15m' },
        },
        // Choropleth-grade per-state per-tick breakdown. Frontend sums
        // counties per tick to derive "established in N states", which
        // is why establishedRange (above) only carries the county count.
        establishedByState: {
          candidates: { where: { status: 'established' } },
          dimensions: [
            { field: 'tickId' },
            { field: 'stateFips', through: 'county' },
          ],
          measures: {
            counties: { agg: 'count_distinct', column: 'countyFips' },
          },
          precompute: { onlyAdditive: true, refreshInterval: '15m' },
        },
        // "Lone star is moving north" — established footprint by year.
        spreadOverTime: {
          candidates: { where: { status: 'established' } },
          dimensions: [
            { field: 'tickId' },
            { field: 'year' },
          ],
          measures: {
            counties: { agg: 'count_distinct', column: 'countyFips' },
          },
          precompute: { onlyAdditive: true, refreshInterval: '15m' },
        },
      },
      grants: {
        search: 'public',
        query: 'public',
        feed: { latest: 'public', recentlyEstablished: 'public' },
        analyze: {
          establishedRange: 'public',
          establishedByState: 'public',
          spreadOverTime: 'public',
        },
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
      feeds: {
        // Admin-side recency: surfaces the latest CDC-import rows so the
        // dashboard can show "what was just ingested." Older imports
        // decay out under the recency half-life.
        latest: {
          candidates: { from: 'recent', limit: 200 },
          rank: { recency: { weight: 1, halfLife: '30d' } },
          pagination: { pageSize: 50, dedup: { by: 'sourceRowId' } },
        },
      },
      analyses: {
        // "Lyme over time" line chart. evolve makes the admin dashboard
        // tick in real time when an import lands.
        casesByYear: {
          candidates: {},
          dimensions: [
            { field: 'year' },
            { field: 'diseaseId' },
          ],
          measures: {
            total: { agg: 'sum', column: 'count' },
            counties: { agg: 'count_distinct', column: 'countyFips' },
          },
          sort: [{ dimension: 'year', dir: 'asc' }],
          precompute: { onlyAdditive: true, refreshInterval: '15m' },
          evolve: { onSubscribe: 'fresh', pollOnIngest: true, minNotifyInterval: '1m' },
        },
        // State-by-state chart on /diseases/[slug]/states.
        casesByState: {
          candidates: {},
          dimensions: [
            { field: 'diseaseId' },
            { field: 'stateFips', through: 'county' },
          ],
          measures: {
            total: { agg: 'sum', column: 'count' },
            counties: { agg: 'count_distinct', column: 'countyFips' },
            yearsCovered: { agg: 'count_distinct', column: 'year' },
          },
          precompute: { onlyAdditive: true, refreshInterval: '15m' },
        },
        // Border-agnostic risk heatmap: cumulative cases bucketed into
        // H3 resolution-4 hexagons (~1,770 km² each, roughly metro
        // area). The dimension hops `through: 'county'` so the bucket
        // can read latitude/longitude off the joined counties row.
        // Strategy will be 'through' (relation traversal does the geo
        // encoding service-side).
        densityByH3: {
          candidates: {},
          dimensions: [
            {
              field: 'latitude',
              through: 'county',
              as: 'h3Cell',
              bucket: {
                type: 'h3',
                resolution: 4,
                latField: 'latitude',
                lngField: 'longitude',
              },
            },
          ],
          measures: {
            total: { agg: 'sum', column: 'count' },
            counties: { agg: 'count_distinct', column: 'countyFips' },
            diseases: { agg: 'count_distinct', column: 'diseaseId' },
          },
          sort: [{ measure: 'total', dir: 'desc' }],
          precompute: { onlyAdditive: true, refreshInterval: '15m' },
        },
        // Top 100 counties by cumulative case count, any disease.
        // "Worst tick counties in America" leaderboard.
        countyHotspots: {
          candidates: {},
          dimensions: [{ field: 'countyFips' }],
          measures: {
            total: { agg: 'sum', column: 'count' },
            mostRecentYear: { agg: 'max', column: 'year' },
            diseases: { agg: 'count_distinct', column: 'diseaseId' },
          },
          sort: [{ measure: 'total', dir: 'desc' }],
          limit: 100,
          precompute: { onlyAdditive: true, refreshInterval: '15m' },
        },
      },
      grants: {
        query: 'public',
        feed: { latest: 'public' },
        analyze: {
          casesByYear: 'public',
          casesByState: 'public',
          countyHotspots: 'public',
          densityByH3: 'public',
        },
      },
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
      feeds: {
        // Mirror of diseaseCountyYear.latest for the monthly bucket.
        latest: {
          candidates: { from: 'recent', limit: 200 },
          rank: { recency: { weight: 1, halfLife: '30d' } },
          pagination: { pageSize: 50, dedup: { by: 'sourceRowId' } },
        },
      },
      analyses: {
        // "When is Lyme season?" radial / line chart, per disease.
        seasonality: {
          candidates: {},
          dimensions: [
            { field: 'month' },
            { field: 'diseaseId' },
          ],
          measures: {
            total: { agg: 'sum', column: 'count' },
            avg: { agg: 'avg', column: 'count' },
          },
          sort: [{ dimension: 'month', dir: 'asc' }],
          precompute: { onlyAdditive: true, refreshInterval: '15m' },
        },
      },
      grants: {
        query: 'public',
        feed: { latest: 'public' },
        analyze: { seasonality: 'public' },
      },
    },

    // ─── Editorial M:N join lenses ──────────────────────────────────
    //
    // Each one sits between two editorial lenses with a `belongsTo` to
    // each side. Callers chain through them: `ticks → diseaseRefs →
    // disease`. Numeric/foreign-key only — not searchable.
    tickDiseases: {
      source: 'main',
      table: 'tick_diseases',
      changeTrackingColumn: 'updatedAt',
      syncInterval: '5m',
      smartSyncInterval: '24h',
      fields: {
        id: { type: 'number', primaryKey: true },
        tickId: { type: 'number', from: 'tick_id' },
        diseaseId: { type: 'number', from: 'disease_id' },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      relations: {
        tick: { lens: 'ticks', kind: 'belongsTo', on: { tickId: 'id' } },
        disease: { lens: 'diseases', kind: 'belongsTo', on: { diseaseId: 'id' } },
      },
      analyses: {
        // Powers the badge on /ticks/[slug]: "carries 4 diseases."
        diseasesPerTick: {
          candidates: {},
          dimensions: [{ field: 'tickId' }],
          measures: { count: { agg: 'count' } },
          sort: [{ measure: 'count', dir: 'desc' }],
        },
        // Inverse — "Lyme is carried by 2 species."
        ticksPerDisease: {
          candidates: {},
          dimensions: [{ field: 'diseaseId' }],
          measures: { count: { agg: 'count' } },
          sort: [{ measure: 'count', dir: 'desc' }],
        },
      },
      grants: {
        query: 'public',
        analyze: { diseasesPerTick: 'public', ticksPerDisease: 'public' },
      },
    },

    tickRemovalTechniques: {
      source: 'main',
      table: 'tick_removal_techniques',
      changeTrackingColumn: 'updatedAt',
      syncInterval: '5m',
      smartSyncInterval: '24h',
      fields: {
        id: { type: 'number', primaryKey: true },
        tickId: { type: 'number', from: 'tick_id' },
        removalTechniqueId: { type: 'number', from: 'removal_technique_id' },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      relations: {
        tick: { lens: 'ticks', kind: 'belongsTo', on: { tickId: 'id' } },
        removalTechnique: { lens: 'removalTechniques', kind: 'belongsTo', on: { removalTechniqueId: 'id' } },
      },
      grants: { query: 'public' },
    },

    wildFactTicks: {
      source: 'main',
      table: 'wild_fact_ticks',
      changeTrackingColumn: 'updatedAt',
      syncInterval: '5m',
      smartSyncInterval: '24h',
      fields: {
        id: { type: 'number', primaryKey: true },
        wildFactId: { type: 'number', from: 'wild_fact_id' },
        tickId: { type: 'number', from: 'tick_id' },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      relations: {
        wildFact: { lens: 'wildFacts', kind: 'belongsTo', on: { wildFactId: 'id' } },
        tick: { lens: 'ticks', kind: 'belongsTo', on: { tickId: 'id' } },
      },
      analyses: {
        // Editorial coverage: which ticks have the fewest wild facts? Sort
        // ascending so the empty/sparse ticks bubble up first. No grant —
        // editorial-only, callable from the admin via the service key.
        factCoverage: {
          candidates: {},
          dimensions: [{ field: 'tickId' }],
          measures: { count: { agg: 'count' } },
          sort: [{ measure: 'count', dir: 'asc' }],
        },
      },
      grants: { query: 'public' },
    },

    wildFactDiseases: {
      source: 'main',
      table: 'wild_fact_diseases',
      changeTrackingColumn: 'updatedAt',
      syncInterval: '5m',
      smartSyncInterval: '24h',
      fields: {
        id: { type: 'number', primaryKey: true },
        wildFactId: { type: 'number', from: 'wild_fact_id' },
        diseaseId: { type: 'number', from: 'disease_id' },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      relations: {
        wildFact: { lens: 'wildFacts', kind: 'belongsTo', on: { wildFactId: 'id' } },
        disease: { lens: 'diseases', kind: 'belongsTo', on: { diseaseId: 'id' } },
      },
      analyses: {
        // Editorial coverage: diseases lacking wild-fact context.
        factCoverage: {
          candidates: {},
          dimensions: [{ field: 'diseaseId' }],
          measures: { count: { agg: 'count' } },
          sort: [{ measure: 'count', dir: 'asc' }],
        },
      },
      grants: { query: 'public' },
    },

    wildFactRemovalTechniques: {
      source: 'main',
      table: 'wild_fact_removal_techniques',
      changeTrackingColumn: 'updatedAt',
      syncInterval: '5m',
      smartSyncInterval: '24h',
      fields: {
        id: { type: 'number', primaryKey: true },
        wildFactId: { type: 'number', from: 'wild_fact_id' },
        removalTechniqueId: { type: 'number', from: 'removal_technique_id' },
        createdAt: { type: 'date', from: 'created_at' },
        updatedAt: { type: 'date', from: 'updated_at' },
      },
      relations: {
        wildFact: { lens: 'wildFacts', kind: 'belongsTo', on: { wildFactId: 'id' } },
        removalTechnique: { lens: 'removalTechniques', kind: 'belongsTo', on: { removalTechniqueId: 'id' } },
      },
      analyses: {
        // Editorial coverage: removal techniques lacking wild-fact context.
        factCoverage: {
          candidates: {},
          dimensions: [{ field: 'removalTechniqueId' }],
          measures: { count: { agg: 'count' } },
          sort: [{ measure: 'count', dir: 'asc' }],
        },
      },
      grants: { query: 'public' },
    },
  },
})
