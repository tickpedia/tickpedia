// Push-side of the SemiLayer change-tracking story.
//
// After every successful write through the admin (content forms, xlsx
// imports), call `notifySemilayer('<lens>')`. It POSTs
// `{"mode":"incremental"}` to `/v1/ingest/<lens>` so the SemiLayer
// worker drains the new rows within ~5s instead of waiting for the
// next cron tick.
//
// This is best-effort: if the POST fails (network blip, key
// misconfigured, SemiLayer down), the lens's `syncInterval` will pick
// the change up on the next 5/15m tick anyway. We never throw out of
// here — the user's write already succeeded by the time we get called.
//
// Lens names are the *config keys* from sl.config.ts (e.g. `ticks`,
// `wildFacts`, `removalTechniques`), NOT the underlying table names.

const url = process.env.SEMILAYER_SERVICE_URL
const key = process.env.SEMILAYER_INGEST_KEY ?? process.env.SEMILAYER_API_KEY

export type Lens =
  | 'ticks'
  | 'wildFacts'
  | 'removalTechniques'
  | 'states'
  | 'counties'
  | 'diseases'
  | 'tickState'
  | 'tickCounty'
  | 'diseaseCountyYear'
  | 'diseaseMonth'

export async function notifySemilayer(lens: Lens): Promise<void> {
  if (!url || !key || key.startsWith('ik_prod_REPLACE') || key.startsWith('sk_dev_REPLACE')) {
    // Dev / unconfigured environment — silent no-op.
    return
  }
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/v1/ingest/${lens}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'incremental' }),
    })
    if (!res.ok && res.status !== 202) {
      console.warn(`[semilayer-notify] ${lens} → ${res.status} ${res.statusText}`)
    }
  } catch (err) {
    // Best-effort — swallow. syncInterval is the safety net.
    console.warn('[semilayer-notify] failed', { lens, err: (err as Error).message })
  }
}

// Convenience: fire several lenses in parallel. Use after a bulk
// import that touched more than one lens (e.g. tick-county presence
// affects both `tickCounty` and possibly `ticks` if a new species was
// referenced).
export async function notifySemilayerLenses(...lenses: Lens[]): Promise<void> {
  await Promise.allSettled(lenses.map((l) => notifySemilayer(l)))
}
