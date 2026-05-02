# Skill: add-an-analyze

Add a declarative aggregation (`analyses.<name>`) to a SemiLayer lens
in `sl.config.ts`. Aggregations surface as
`beam.<lens>.analyze.<name>()` after `pnpm semilayer:generate`.

## Anatomy

```ts
analyses: {
  myMetric: {
    candidates: { where: { status: 'active' } },   // pre-aggregate filter
    dimensions: [{ field: 'category' }],            // GROUP BY shape
    measures: { count: { agg: 'count' } },          // aggregate functions
    sort: [{ measure: 'count', dir: 'desc' }],
    limit: 100,
    precompute: { onlyAdditive: true, refreshInterval: '15m' },
  },
}
```

Each metric also needs a grant entry:

```ts
grants: {
  …existing,
  analyze: { myMetric: 'public' },
}
```

Omitting the grant leaves the analysis dormant — the lens registers it
but `pk_` callers get 404. Editorial-only metrics (admin dashboards)
ride that path: declared, ungranted, callable from server actions via
the service key.

## When to precompute

Precompute materializes the rollup so reads are fast. Use it when:

- The candidate pool is large (every CDC surveillance lens — tens of
  thousands of rows across years).
- The metric is read on a public page where p95 matters.
- All measures are additive (`count`, `sum`, `count_distinct` with
  `accuracy: 'fast'`, `max`, `min`). Set `onlyAdditive: true` so the
  worker can fold new rows in incrementally instead of rebuilding.

Skip precompute when:

- The candidate pool is small (a few hundred rows; e.g. editorial
  joins like `tickDiseases`).
- The metric is admin-only and run once per pageview.
- Any measure is non-additive (`percentile`, exact distinct, `top_k`)
  — those recompute on read regardless.

## Choosing `refreshInterval`

The interval is the worker's **no-faster-than** sweep on idle;
write-driven invalidation still fires on every ingest, so the rollup
is fresh in practice. Pick the largest value the use case tolerates:

| Cadence of underlying writes | `refreshInterval` |
|---|---|
| Many writes/minute (live events) | `'1m'` |
| Editorial admin writes | `'5m'` |
| Yearly / monthly bulk imports | `'15m'` |

## Cross-lens dimensions (`through:`)

`{ field: 'stateFips', through: 'county' }` resolves the dimension
through a declared `belongsTo` relation. Useful for "cases by state"
when the source lens (`diseaseCountyYear`) only has `countyFips`. The
relation must already be declared on the source lens.

## Running

```bash
pnpm semilayer:push        # validates + applies to the live tenant
pnpm semilayer:generate    # regenerate ./generated/semilayer
pnpm typecheck             # admin + e2e pick up the new client types
pnpm semilayer:smoke       # registration + lens + feed checks
```

## Don'ts

- Don't dimension on `_embedding` directly unless you're using
  `bucket: { type: 'semantic', clusters: N }` — it's only valid as a
  semantic-cluster source.
- Don't use `accuracy: 'exact'` for `count_distinct` / `percentile` /
  `top_k` on big lenses; the sketches default (`'fast'`) is intentional.
- Don't add a metric whose only consumer is "I might want this someday."
  The grant is a public contract; a stray analysis bloats the API
  surface and the smoke test.
