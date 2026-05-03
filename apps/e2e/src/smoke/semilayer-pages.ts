// Page-data smoke. Iterates every canonical URL × the matching
// PageReads entry and asserts every read returns data (modulo
// `emptyOk` for entities whose imports haven't landed). Catches the
// class of bug where a page would render empty in production because
// the lens returned `[]` — without needing Playwright.
//
// Output mirrors `semilayer-lenses.ts`: sectioned per page kind, ✓/✗
// per URL, summary at the end.
//
// Budget: under 60s for the full URL set. We sample parametric
// patterns by default (3 URLs per kind) so 3,000+ counties don't
// blow it; static URLs always run. Set `SMOKE_SAMPLE=full` to iterate
// every URL.
//
//   pnpm --filter @tickpedia/e2e smoke:pages
//
// Required env (loaded from the repo-root .env via tsx --env-file):
//   SEMILAYER_SERVICE_URL
//   NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY

import { BeamClient } from '@semilayer/client'
import {
  listCanonicalUrls,
  type CanonicalUrl,
  type EntityKind,
} from '../fixtures/canonical-urls.js'
import { PAGE_READS, isEmptyResult, type PageReadSpec } from '../fixtures/page-reads.js'

interface Failure {
  url: string
  read: string
  reason: string
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`✗ Missing env var ${name}. Set it in .env or export it before running.`)
    process.exit(2)
  }
  return v
}

async function main(): Promise<void> {
  const baseUrl = requireEnv('SEMILAYER_SERVICE_URL')
  const apiKey = requireEnv('NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY')
  if (!apiKey.startsWith('pk_')) {
    console.error(
      `✗ Expected a public key (pk_…) in NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY, got "${apiKey.slice(0, 8)}…"`,
    )
    process.exit(2)
  }

  const sampleMode = process.env.SMOKE_SAMPLE ?? 'sample'
  const sample = sampleMode === 'full' ? undefined : 3

  const client = new BeamClient({ baseUrl, apiKey })
  console.log(
    `SemiLayer page-data smoke → ${baseUrl}  (key ${apiKey.slice(0, 12)}…)  sample=${sample ?? 'full'}\n`,
  )

  const urls = await listCanonicalUrls(client, sample !== undefined ? { sample } : {})
  const grouped = groupByKind(urls)

  const failures: Failure[] = []
  let totalReads = 0

  for (const [kind, kindUrls] of grouped) {
    const entry = PAGE_READS.get(kind)
    if (!entry) {
      console.log(`-- ${kind} (${kindUrls.length} url${kindUrls.length === 1 ? '' : 's'})`)
      console.log(`  ⚠ no PageReads entry — add one in fixtures/page-reads.ts`)
      failures.push({
        url: `${kind}:*`,
        read: '(missing PageReads)',
        reason: `no PAGE_READS entry for kind "${kind}"`,
      })
      continue
    }
    console.log(
      `-- ${kind} (${kindUrls.length} url${kindUrls.length === 1 ? '' : 's'}, ${entry.reads.length} read${entry.reads.length === 1 ? '' : 's'} each)`,
    )

    if (entry.reads.length === 0) {
      console.log('  · no reads (static page)')
      continue
    }

    for (const url of kindUrls) {
      const startedAt = Date.now()
      const results = await Promise.all(
        entry.reads.map((spec) => runOne(spec, url, client)),
      )
      totalReads += results.length
      const tookMs = Date.now() - startedAt

      const lines = results.map((r) => formatResult(r))
      const anyFail = results.some((r) => r.kind === 'fail')
      const mark = anyFail ? '✗' : '  '
      console.log(`${mark} ${pad(url.path, 50)}  ${tookMs}ms  ${lines.join(' · ')}`)

      for (const r of results) {
        if (r.kind === 'fail') {
          failures.push({ url: url.path, read: r.label, reason: r.reason })
        }
      }
    }
  }

  console.log('')
  if (failures.length > 0) {
    console.error(`✗ ${failures.length} read failure${failures.length === 1 ? '' : 's'} (out of ${totalReads} total reads, ${urls.length} urls)`)
    for (const f of failures) console.error(`  - ${f.url}  ${f.read}: ${f.reason}`)
    process.exit(1)
  }

  console.log(`✓ all ${totalReads} reads healthy across ${urls.length} urls`)
}

function groupByKind(urls: readonly CanonicalUrl[]): Map<EntityKind, CanonicalUrl[]> {
  const out = new Map<EntityKind, CanonicalUrl[]>()
  for (const u of urls) {
    const list = out.get(u.kind)
    if (list) list.push(u)
    else out.set(u.kind, [u])
  }
  return out
}

interface ReadOk {
  kind: 'ok'
  label: string
}
interface ReadEmpty {
  kind: 'empty-ok'
  label: string
}
interface ReadFail {
  kind: 'fail'
  label: string
  reason: string
}
type ReadOutcome = ReadOk | ReadEmpty | ReadFail

async function runOne(
  spec: PageReadSpec,
  url: CanonicalUrl,
  client: BeamClient,
): Promise<ReadOutcome> {
  try {
    const result = await spec.run(url, client)
    if (isEmptyResult(result)) {
      if (spec.emptyOk) return { kind: 'empty-ok', label: spec.label }
      return { kind: 'fail', label: spec.label, reason: 'returned empty (no rows / buckets / items)' }
    }
    return { kind: 'ok', label: spec.label }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { kind: 'fail', label: spec.label, reason: msg }
  }
}

function formatResult(r: ReadOutcome): string {
  if (r.kind === 'ok') return `✓ ${r.label}`
  if (r.kind === 'empty-ok') return `· ${r.label} (empty — ok)`
  return `✗ ${r.label}`
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length)
}

main().catch((err) => {
  console.error('✗ unexpected error:', err)
  process.exit(1)
})
