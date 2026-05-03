# Skill: add-a-page

Add a single new route to `apps/web` with full coverage in one pass.

> **For shipping a whole page family** (a phase from step 05 — tick,
> disease, pathogen, technique, state, county, facts, risk),
> use **`ship-a-phase.md`** instead. That skill drives the canonical
> page-family shape (sections/, data/, seo.ts, SSR prefetch, e2e
> scenarios, PageReads, cross-link retrofit) autonomously and is loop-
> compatible. This file is for **one-off pages** that don't fit a
> phase — meta surfaces (`/about`, `/sources`, `/contribute`),
> redirect stubs, and the like.

## Steps (one-off page)

1. **Component** — drop a new file under
   `apps/web/src/pages/<area>/<Name>Page.tsx`. Pure component; data
   fetching goes through the SemiLayer Beam (or static content if
   the page doesn't need a lens).

2. **SEO** — every public route gets `useDocumentHead({ title,
   canonicalPath, description })`. Compose the title as
   `<Page name> | Tickpedia`. Canonical absolute URL is built from
   `pathFor(kind)` against the URL contract.

3. **Wire it** — add a `RouteSwitch` arm in `apps/web/src/App.tsx`
   that matches the route's `kind` (from `routes/contract.ts`) and
   renders the page. If the kind is missing from the contract, add
   it to `URL_PATTERNS` first — the contract is the source of truth.

4. **Footer + header** — wrap the page in `PageHeader` + `Footer`
   from `pages/shared/index.js`. Every entity / meta page reads as
   half-finished without the global footer.

5. **Unit test** — `apps/web/src/pages/<area>/__tests__/<Name>Page.test.tsx`.
   Use `@testing-library/react`. Cover: renders headline, renders
   the data contract or the static body, renders an empty state if
   the page reads from a lens.

6. **E2E** — `apps/e2e/src/scenarios/<area>/<name>.spec.ts`. One
   happy-path test per page: H1 visible, canonical link correct,
   any cross-links resolve. The Playwright `webServer` already
   builds and previews `apps/web`, so you don't need to start
   anything by hand.

7. **Verify** —
   ```bash
   pnpm --filter @tickpedia/web typecheck
   pnpm --filter @tickpedia/web test --run
   pnpm --filter @tickpedia/e2e exec playwright test scenarios/<area>
   ```

## Don'ts

- Don't fetch from Neon directly in the browser. Reads go through
  SemiLayer (`apps/web/src/lib/beam.ts`).
- Don't introduce a new router framework. The pathname-driven
  switch in `App.tsx` is sufficient until a real navigation use case
  emerges.
- Don't add Tailwind / CSS-in-JS until styling complexity demands
  it. Use the design tokens at `apps/web/src/design/tokens.css`.
- Don't inline `gridTemplateColumns: 'XX YY ZZ'`. Add a class to
  `tokens.css` with the breakpoints established by phase 4 (880px
  and 560px).
