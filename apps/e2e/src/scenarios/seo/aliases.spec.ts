import { test, expect } from '@playwright/test'

// Alias stubs are emitted by `apps/web/scripts/emit-alias-stubs.ts`
// after `vite build`. Each lives at `dist/<from>/index.html` and
// carries a meta-refresh + canonical link to the `<to>` URL.
// We assert one representative from each redirect family rather than
// iterating the full table — the script's unit test
// (`apps/web/src/__tests__/aliases.test.ts`) covers every entry.

const REPRESENTATIVES: ReadonlyArray<{ from: string; to: string }> = [
  { from: '/ticks/ixodes-scapularis',         to: '/ticks/blacklegged-tick' },
  { from: '/diseases/borreliosis',            to: '/diseases/lyme-disease' },
  { from: '/states/me',                       to: '/states/maine' },
  { from: '/counties/23005',                  to: '/counties/maine/cumberland' },
  { from: '/learn/how-to-remove-a-tick',      to: '/techniques/fine-tipped-tweezers' },
]

test.describe('seo · alias stubs', () => {
  for (const alias of REPRESENTATIVES) {
    test(`${alias.from} stub redirects to ${alias.to}`, async ({ request }) => {
      const res = await request.get(alias.from)
      expect(res.ok(), `${alias.from} did not 200`).toBe(true)
      const body = await res.text()

      // Canonical link points at the `to` URL.
      expect(body).toMatch(
        new RegExp(`<link rel="canonical" href="${escape(alias.to)}">`),
      )
      // Meta-refresh fires immediately.
      expect(body).toMatch(
        new RegExp(`<meta http-equiv="refresh" content="0; url=${escape(alias.to)}">`),
      )
      // Alias is noindex so it doesn't compete for rank.
      expect(body).toMatch(/<meta name="robots" content="noindex">/)
      // Human fallback anchor for assistive tech.
      expect(body).toContain(`<a href="${alias.to}">${alias.to}</a>`)
    })
  }
})

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
