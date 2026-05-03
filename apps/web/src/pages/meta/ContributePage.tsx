import { MetaPage } from './MetaPage.js'

// /contribute — how to land a change. Mostly a pointer to GitHub +
// a short description of the kinds of contributions the project
// welcomes. Honest about scope: we accept editorial fixes, new
// canonical entities, and code; we do not accept "do not link to
// my page" requests since the underlying data is public.

export function ContributePage() {
  return (
    <MetaPage
      title="Contribute"
      eyebrow="Open source"
      lede="Tickpedia is open source on GitHub. Editorial fixes, new tick species, removal techniques, wild facts, and code are all welcome via pull request."
      canonicalPath="/contribute"
    >
      <section className="tp-section">
        <h2 className="tp-serif">What you can contribute</h2>
        <ul className="tp-list">
          <li>
            <strong>Editorial fixes.</strong> A typo, a stale citation,
            a one-liner that reads awkwardly, an outdated removal
            step. Open an issue or send a PR; small fixes ship the
            same day.
          </li>
          <li>
            <strong>New canonical entities.</strong> A tick species
            that's not yet on the site, a disease without a page, a
            removal technique with a real evidence base. Each lives
            in a JSON file under{' '}
            <code>db/src/seeds/data/</code> with an accompanying
            citation list.
          </li>
          <li>
            <strong>Wild facts.</strong> The "wild facts" rail
            ranks attached facts by relevance to whichever entity
            you're reading about. Submitting one means it shows up
            on every related page.
          </li>
          <li>
            <strong>Code.</strong> The site is TypeScript-strict, with
            Vitest unit coverage, Playwright e2e, and a SemiLayer
            read layer. Contributing code means following the
            existing tests + e2e patterns. Read{' '}
            <a href="https://github.com/tickpedia/tickpedia/blob/main/agents.md" rel="noreferrer">
              agents.md
            </a>{' '}
            for the conventions.
          </li>
        </ul>
      </section>

      <section className="tp-section">
        <h2 className="tp-serif">How to land a change</h2>
        <ol className="tp-list">
          <li>
            Fork the repo at{' '}
            <a href="https://github.com/tickpedia/tickpedia" rel="noreferrer">
              github.com/tickpedia/tickpedia
            </a>
            .
          </li>
          <li>
            Run <code>pnpm db:setup:local</code> to boot Postgres,
            migrate, and seed in one shot. Then{' '}
            <code>pnpm verify</code> to confirm everything is green
            — should take under 30 minutes from a fresh clone if
            you have Docker.
          </li>
          <li>
            Open a PR against <code>main</code>. CI runs typecheck,
            unit tests, and the hermetic Playwright e2e on every PR.
            Green tests are required for merge.
          </li>
          <li>
            For editorial PRs: cite the source. For code PRs: ship
            with tests.
          </li>
        </ol>
      </section>

      <section className="tp-section">
        <h2 className="tp-serif">What we can't do</h2>
        <p>
          We can't honor "do not link to my page" requests for entries
          built from public surveillance data — the underlying CDC
          and Census files are public domain, and the encyclopedia
          structure is the product. We're happy to correct factual
          errors and update outdated information; that's what the
          issue tracker is for.
        </p>
      </section>
    </MetaPage>
  )
}
