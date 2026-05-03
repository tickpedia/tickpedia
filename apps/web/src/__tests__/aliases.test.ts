import { describe, it, expect } from 'vitest'
import { ALIASES, renderAliasStub } from '../aliases.js'
import { matchRoute } from '../routes/index.js'

describe('ALIASES', () => {
  it('every from + to begins with `/`', () => {
    for (const a of ALIASES) {
      expect(a.from.startsWith('/'), `from: ${a.from}`).toBe(true)
      expect(a.to.startsWith('/'), `to: ${a.to}`).toBe(true)
    }
  })

  it('no alias `from` collides with another alias `from`', () => {
    const seen = new Set<string>()
    for (const a of ALIASES) {
      expect(seen.has(a.from), `duplicate from: ${a.from}`).toBe(false)
      seen.add(a.from)
    }
  })

  it('every alias `to` resolves to a kind in the URL contract', () => {
    for (const a of ALIASES) {
      const m = matchRoute(a.to)
      expect(m, `alias.to does not match any URL_PATTERN: ${a.to}`).not.toBeNull()
    }
  })

  it('no alias `from` accidentally matches the canonical contract — that would mean the canonical is also being shadowed', () => {
    // Aliases live OUTSIDE the canonical URL space. /states/me must not
    // be a canonical URL; only /states/maine is. (Parametric paths like
    // /ticks/ixodes-scapularis WILL match the tick pattern by shape;
    // they're rejected by the live data — there's no tick with that
    // slug — and the alias stub redirects before the SPA hydrates.)
    // We can only sanity-check the static-shape aliases here.
    for (const a of ALIASES) {
      if (a.from === '/learn/how-to-remove-a-tick' || a.from.startsWith('/learn/')) {
        // /learn/* is outside the contract entirely.
        const m = matchRoute(a.from)
        expect(m, `${a.from} should not match a canonical pattern`).toBeNull()
      }
    }
  })

  it('contains at least the ticks → common-name canonical aliases (Section B4 minimum)', () => {
    const expectedFroms = [
      '/ticks/ixodes-scapularis',
      '/ticks/deer-tick',
      '/ticks/dermacentor-variabilis',
      '/ticks/amblyomma-americanum',
      '/ticks/ixodes-pacificus',
      '/ticks/rhipicephalus-sanguineus',
      '/diseases/borreliosis',
      '/diseases/rocky-mountain-spotted-fever',
      '/diseases/alpha-gal',
      '/states/me',
      '/states/23',
      '/counties/23005',
      '/learn/how-to-remove-a-tick',
      '/learn/permethrin',
      '/learn/tick-tubes',
    ]
    const got = new Set(ALIASES.map((a) => a.from))
    for (const f of expectedFroms) {
      expect(got.has(f), `missing alias.from: ${f}`).toBe(true)
    }
  })
})

describe('renderAliasStub', () => {
  const sample = { from: '/ticks/deer-tick', to: '/ticks/blacklegged-tick' }

  it('renders a doctype html document', () => {
    const html = renderAliasStub(sample)
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('</html>')
  })

  it('includes the canonical link pointing at the `to` URL', () => {
    const html = renderAliasStub(sample)
    expect(html).toContain('<link rel="canonical" href="/ticks/blacklegged-tick">')
  })

  it('includes a 0-second meta refresh to the `to` URL', () => {
    const html = renderAliasStub(sample)
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=/ticks/blacklegged-tick">')
  })

  it('marks the stub `noindex` so the alias does not compete for rank', () => {
    const html = renderAliasStub(sample)
    expect(html).toContain('<meta name="robots" content="noindex">')
  })

  it('includes a human fallback anchor for assistive tech', () => {
    const html = renderAliasStub(sample)
    expect(html).toContain('<a href="/ticks/blacklegged-tick">/ticks/blacklegged-tick</a>')
  })

  it('prepends the origin when one is supplied (absolute canonical for prod build)', () => {
    const html = renderAliasStub(sample, 'https://tickpedia.com')
    expect(html).toContain(
      '<link rel="canonical" href="https://tickpedia.com/ticks/blacklegged-tick">',
    )
    expect(html).toContain(
      '<meta http-equiv="refresh" content="0; url=https://tickpedia.com/ticks/blacklegged-tick">',
    )
  })

  it('every alias renders without throwing', () => {
    for (const a of ALIASES) {
      const html = renderAliasStub(a)
      expect(html.length).toBeGreaterThan(50)
      expect(html).toContain(a.to)
    }
  })
})
