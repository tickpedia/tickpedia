# Skill: add-a-page

Add a new route to `apps/web` with full coverage in one pass.

## Steps

1. **Component** — drop a new file under `apps/web/src/pages/<Name>.tsx`.
   Pure component; data fetching goes through the SemiLayer Beam (or a
   stub if the lens isn't ready yet).

2. **Wire it** — add to whatever router is in use (currently a single
   `App.tsx`; introduce `react-router` only when a second page lands).

3. **Unit test** — `apps/web/src/__tests__/<Name>.test.tsx`. Use
   `@testing-library/react`. Cover: renders headline, renders the data
   contract, renders an empty state.

4. **E2E** — `apps/e2e/src/<name>.spec.ts`. One happy-path test per page.
   The Playwright `webServer` already builds and previews `apps/web`, so
   you don't need to start anything by hand.

5. **Verify** —
   ```bash
   pnpm --filter @tickpedia/web test
   pnpm e2e
   ```

## Don'ts

- Don't fetch from Neon directly in the browser. Reads go through SemiLayer.
- Don't introduce a router until there's a second page that needs it.
- Don't add Tailwind/CSS-in-JS until styling complexity demands it.
