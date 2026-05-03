# Skill: ship-a-phase

> **Full autonomy, get-it-done-at-all-costs persona.** When invoked
> (manually, via `/ship-a-phase`, or under `/loop`), you have authority
> to ship one phase of step 05 end-to-end with **no review checkpoint**:
> build, write tests, write e2e, run `pnpm verify`, commit, push, tick
> the matching DoD box in the plan repo, push there too. The user reads
> the diff after — not before. The loop fires you again on the next
> phase until they're all shipped.
>
> **The bar for asking is high.** If you would have asked, decide
> instead and document the call in the commit body. Stop only on the
> hard blockers in §10 below.

## 1. Purpose

`Z:/tickpedia/plan/steps/05_design_handoff_and_urls.md` carves the
public site into ~12 page families (tick, disease, pathogen,
technique, state, county, facts, home/risk, mobile-audit, meta). Phase
4 (tick) shipped through `ship-a-step` over many sessions. The
remaining phases all follow the same shape — read brief, build the
page family, ship it. This skill drives that shape **autonomously, in
a loop**, so a single overnight run can move the site forward by
several phases.

## 2. Invocation

```
/ship-a-phase                       # ship the next [ ] phase, default scope
/ship-a-phase phase 5               # ship a specific phase by number
/ship-a-phase phase 5 dry-run       # plan + emit the brief, do not commit
/loop 30m /ship-a-phase             # fire every 30 minutes (recommended)
/loop /ship-a-phase                 # self-pace (the model picks its rhythm)
```

The slash command is registered at `.claude/commands/ship-a-phase.md`.
`/loop` is a global skill from your harness; chaining the two is the
intended pattern.

When invoked from `/loop`, **do not pause for review**. After commit +
push, return cleanly so the next loop tick picks up the next phase.

## 3. Autonomy contract (the philosophy)

The user's standing instruction: **"more get-it-done, less ask me
questions."** Internalize this:

- **Design ambiguity → decide.** Pick the choice most consistent with
  the already-shipped sibling phase. Document the call in the commit
  body under "Decisions". Never block on it.
- **Empty / missing data → render the empty state and ship.** If a
  SemiLayer lens returns `[]`, the page renders its empty-state copy.
  That's the contract; no need to ask.
- **CI failure → read the log + patch.** If GitHub CI fails after
  push, fetch the run with `gh run view <id> --log-failed`, diagnose,
  patch in a follow-up commit, push. Treat it like a local verify
  failure.
- **Missing brief → generate one.** If `plan/phases/phase_<N>_<topic>.md`
  doesn't exist when you need it, derive it from §B of step 05 + the
  matching `plan/design/art-*.jsx` mockup + the shipped sibling.
  Write it to disk, commit it to the plan repo as part of the work,
  and proceed. Don't ask the user to write it.
- **Design mockup mismatch → trust the URL contract.** If the design
  shows a section the data doesn't support yet, ship without that
  section and add a one-line follow-up in the brief. The URL contract
  is forever; the design can iterate.

The only things that warrant stopping are in §10.

## 4. The page-family shape (canonical structure)

Every page family ships **all** of these. Mirror `apps/web/src/pages/tick/`:

```
apps/web/src/pages/<family>/
├── <Family>Page.tsx               # /ticks/[slug] equivalent
├── <Family><Sub>Page.tsx          # one per sub-page in §B1 of step 05
├── data/
│   ├── use<Thing>.ts              # one hook per lens read; SSR-aware
│   ├── cache-keys.ts              # SSR cache key builders
│   └── __tests__/
├── sections/
│   ├── HeroSection.tsx            # uses .tp-hero — already responsive
│   ├── <Other>Section.tsx
│   └── __tests__/
├── seo.ts                         # buildHead + JSON-LD per §B3 of step 05
└── __tests__/
    ├── <Family>Page.test.tsx
    └── seo.test.ts

apps/web/src/ssr/prefetch/<family>.ts   # prefetch fn for the prerender pipeline
apps/web/src/routes/                    # already covers the URL — just verify
apps/web/src/aliases.ts                 # add any aliases from §B4
apps/e2e/src/scenarios/<family>/
├── <family>.spec.ts                # canonical render + sub-page navigation
├── interactivity.spec.ts           # only if the page has new interactivity
└── mobile.spec.ts                  # mobile reflow assertions

apps/e2e/src/fixtures/page-reads.ts # add the PageReads entry for this kind
```

Use `apps/web/src/pages/tick/` as the literal template — copy-paste
its structure, then swap the lens and the section names.

### Already-built primitives (do not re-derive)

- `Choropleth` / `LinkableChoropleth` — pass `linkFor` + `titleFor`
- `Leaderboard` — top-N rankings
- `LineChart`, `Sparkline`, `BarRow`, `RadialSeasonality`, `HexHeatmap`
- `STATES_BY_USPS`, `stateNameFor`, `stateSlugFor` — state code lookups
- `PageHeader`, `Crumb`, `Stat`, `Footer`, `useDocumentHead`
- `TickCrest`, `Wordmark` from `@tickpedia/ui`
- `.tp-hero`, `.tp-range-grid`, `.tp-section`, `.tp-chip`, `.tp-table`
  — all responsive

### CSS

Mobile reflow is **inherited automatically** through `.tp-hero` and
`.tp-range-grid`. If a section needs a custom grid, add a class to
`apps/web/src/design/tokens.css` with breakpoints at 880px and 560px
(the same set the tick page uses). Never inline `gridTemplateColumns`.

## 5. The brief format (`plan/phases/phase_<N>_<topic>.md`)

Briefs are **agent-facing**, not human-facing. Concise, opinionated,
decisive. Target ~80 lines.

```markdown
# Phase <N> — <topic>

## Routes
- /<path>
- /<path>/[slug]
- /<path>/[slug]/<sub>            (one per row in §B1)

## Lens reads
- diseases.query({ where: { slug } })   → useDisease
- diseaseCountyYear.analyze.casesByState → useDiseaseStates
- ...

## Charts (from existing primitives)
- Choropleth on /states sub-page
- RadialSeasonality on /seasonality
- ...

## Cross-links
**In** (already shipped, verify still wired):
- tick page → /diseases/[slug] ✓ (DiseasesSection)
**Out** (this phase):
- every tick that carries it → /ticks/[slug]
- every pathogen → /pathogens/[slug] (links to alias stub if 5b not shipped)
- /risk/[slug] flagship CTA

## JSON-LD type
MedicalCondition

## Hero composition
- Eyebrow: "Tick-borne illness"
- H1: displayName
- Lede: oneLiner
- Chips: "Cases · N", "Carried by N ticks" (anchor #ticks),
  "/risk map →" (anchor /risk/[slug])
- At-a-glance: total cases, peak month, top state, year-of-data

## Empty / loading / error copy
- Empty leaderboard: "No CDC-reported cases yet for ${name}."
- Empty seasonality: "Monthly breakdown not yet imported."
- Loading: "…" placeholders
- Error: red text, mono font, copy from RangeSection's ErrorMessage

## Decisions made upfront (do NOT ask)
- Severity color: don't ship per-disease; use neutral chips.
- Pathogen rail when 5b deferred: render names as <a> to /pathogens/[slug];
  the alias map handles missing pages.
- Top-N: 8 (matches phase 4).

## Mobile reflow
Inherits .tp-hero + .tp-range-grid. No new media queries.

## Follow-ups (out of scope this phase, log here)
- ...
```

If the brief is missing when you need it, **generate one** from §B of
step 05 + the matching `art-*.jsx` mockup + the shipped sibling
template (phase 4 / tick is canonical), write it to disk, commit it
to the plan repo with subject `phases: brief for phase N`. Then
proceed. The user can edit it later.

## 6. The procedure

### Step 0 — Re-sync state

Both repos may have moved since the last loop tick:

```bash
cd Z:/tickpedia/tickpedia && git pull --ff-only
cd Z:/tickpedia/plan && git pull --ff-only
```

If either pull fails (diverged), stop per §10.

### Step 1 — Pick the phase

Read the "Status (at-a-glance)" block at the top of
`Z:/tickpedia/plan/steps/05_design_handoff_and_urls.md`.

The next phase is the **first `[ ]` row in "Page families"** — except:
- Skip phase 5b (pathogen) by default; it's marked deferrable. Only
  ship it if explicitly invoked or all earlier numbered phases are done.
- If the user passed `phase N`, ship that one regardless of order.

### Step 2 — Read the brief

`plan/phases/phase_<N>_<topic>.md`. If missing, generate per §5.

### Step 3 — Read the design + the shipped sibling

```bash
# Design — natural-language description of the page
Read Z:/tickpedia/plan/design/art-<matching>.jsx

# Sibling — the literal code template
ls apps/web/src/pages/tick/             # phase 4 — always the template
```

### Step 4 — Build

Mirror the tick/ structure into pages/<family>/. Reads via the
generated `BeamClient`; never `@tickpedia/db`. Tick imagery via
`TickCrest` from `@tickpedia/ui`. Per-section components, colocated
unit tests, named exports.

For each new lens read, add an SSR-aware data hook under
`pages/<family>/data/`. Pattern from `apps/web/src/pages/tick/data/useTickRange.ts`:

```ts
const initial = useSSRData<T>(cacheKey)
// ... useState, useRef, useEffect with cancellation
```

Add the prefetch fn at `apps/web/src/ssr/prefetch/<family>.ts`. The
prerender script at `apps/web/scripts/prerender.ts` already iterates
canonical URLs — just register the kind in its switch.

### Step 5 — Wire the router

Add the `RouteSwitch` arms in `apps/web/src/App.tsx` for the new
kinds. Pattern is dead simple — match on `matched.kind`.

### Step 6 — SEO

Build `pages/<family>/seo.ts` with `buildHead` (title / description /
canonical) and `buildJsonLd`. Hook into the page component via
`useDocumentHead`. JSON-LD type per §B3 of step 05.

### Step 7 — Tests

- Unit: colocated `__tests__/`, mock `lib/beam.js` at the module
  boundary (see `pages/tick/__tests__/TickPage.test.tsx`).
- E2E: `apps/e2e/src/scenarios/<family>/<family>.spec.ts` — render
  H1 + canonical + at least one cross-link + the global footer.
- Mobile: `apps/e2e/src/scenarios/<family>/mobile.spec.ts` at 375px
  viewport — assert `documentElement.scrollWidth - innerWidth <= 1`,
  H1 within viewport, sections stack.

### Step 8 — PageReads + canonical-urls

- `apps/e2e/src/fixtures/page-reads.ts` — add the `PageReads` entry.
  Set `emptyOk: true` on any read that may legitimately return empty
  in the current data state, with a comment.
- `apps/web/src/routes/canonical-urls.ts` already derives the URLs
  from SemiLayer — verify the new patterns expand.

### Step 9 — Cross-link retrofit

When this page family ships, retro-fit incoming links from
already-shipped families:

| Shipping | Retro-fit |
|---|---|
| disease | tick page hero already has `Carries N diseases` chip ✓; Add a "Diseases" rail to TickPage with thumbnails (small cards, name + oneLiner). |
| pathogen (5b) | TickPage + DiseasePage gain a Pathogens rail; HeroSection chip "Pathogens · N". |
| state | TickPage `Established · N counties` chip already links to #range; verify; no retro-fit needed. |
| county | StatePage gains a "Worst counties" leaderboard if not already there. |
| ... | ... |

Keep retro-fits **scoped** — modify the chip rail / new section, not
whole pages. One retro-fit commit per family is fine.

### Step 10 — Verify

```bash
cd Z:/tickpedia/tickpedia
pnpm typecheck
pnpm test --run
pnpm e2e
```

Iterate up to 3 times on the same root cause. If still failing,
stop per §10.

`pnpm verify` runs all four (typecheck, test, smoke:lenses,
smoke:pages, e2e); use it for the final gate. The smoke commands
need `NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY` in `.env` — already there
in the user's local; CI has the secret wired.

### Step 11 — Commit + push (tickpedia)

Stage explicitly. Conventional subject; body in 4–8 bullets
describing **what shipped + what the user can now do**. Add a
"Decisions" section listing the design calls you made autonomously.

```bash
git add <explicit files>
git commit -m "$(cat <<'EOF'
feat(web): <family> page family — phase <N>

- /<path>, /<path>/[slug], + N sub-pages.
- Reads from <lens names>.
- Cross-links: <in/out summary>.

Decisions:
- <design call 1 — picked X over Y because <reason>>
- <design call 2>
EOF
)"
git push origin main
```

**No `Co-Authored-By:` trailer. No emojis.**

### Step 12 — Tick the DoD + push (plan)

Flip every shipped `[ ]` to `[x]` in step 05 + add the commit hash.
Update the §C2 phase table row note. If §C3 has carry-overs that this
phase resolved, flip those too.

```bash
cd Z:/tickpedia/plan
git add steps/05_design_handoff_and_urls.md
git commit -m "step 05: phase <N> shipped — <one-line>"
git push origin main
```

If you generated a brief in step 2, that goes in a separate prior
commit (subject `phases: brief for phase N`).

### Step 13 — Done

Return cleanly. The loop's next tick picks up the next phase. If you
ran outside the loop, summarize what shipped + what's next in 2–3
lines.

## 7. Hard rules (carry over from `ship-a-step`)

These are dictated by the user; do not relax:

1. **No `Co-Authored-By:` in commits.** Plain message bodies.
2. **No emojis** anywhere.
3. **No SemiLayer internals** in the public OSS repo (token paths,
   internal bug refs). The plan repo is fine.
4. **DB schema changes** (rare in page-family work, but if needed):
   Drizzle, generate migration, hand-edit if backfill is needed.
5. **No `--no-verify`, no force-push, no destructive resets.**
6. **Don't restart the user's dev servers.** They keep `pnpm dev` up;
   the e2e harness is hermetic on `:4173`.
7. **Don't drag in stray working-tree changes.** `git status --short`
   first; stage explicitly.
8. **Validate any wire SQL against the local DB.** Auto-memory rule
   from prior incident.

## 8. Cross-link retrofit policy

When shipping family X retro-fits links from already-shipped families
to X. The retro-fit is part of the *same* phase commit — one PR ships
the new family + the incoming links. Keep edits scoped:

- Hero chip count (e.g. "Pathogens · N") — one chip + an anchor
- A new section under the existing page's bottom rails
- A new sub-page link in the breadcrumb / nav

Do **not**: rewrite an already-shipped page's structure to make room
for the new rail. If accommodation needs structural change, that's a
follow-up commit, not a retro-fit.

## 9. Brief generation (when missing)

If `plan/phases/phase_<N>_<topic>.md` doesn't exist:

1. Read step 05 §B1 (URL contract) for the family's routes.
2. Read step 05 §B3 (internal-linking density table) for the
   cross-links from/to the family.
3. Read `plan/design/art-<matching>.jsx`. If no matching art file,
   note it in the brief's Follow-ups and proceed using the tick page
   as the visual template.
4. Read `apps/web/src/pages/tick/` as the structural template.
5. Read `sl.config.ts` for the lens definitions + analyses available.
6. Compose the brief per the template in §5. Make all design calls
   listed under "Decisions made upfront" — do not leave Open Qs in a
   generated brief.
7. Write to disk; commit to plan repo.

A generated brief is the agent's contract with itself; the user can
edit it later but is not blocked on doing so.

## 10. Failure modes — when to actually stop

These are the only conditions that warrant stopping the loop and
asking the user. Everything else: decide, ship, document.

1. **`pnpm verify` fails ≥3 times on the same root cause.** Cite the
   check that failed (typecheck / unit / lens-smoke / page-smoke /
   playwright), the suspected root cause, and what you'd try next.
2. **A required SemiLayer lens does not exist in `sl.config.ts`.**
   Adding lenses is `add-a-lens.md` work, not page-family work.
3. **A required DB column doesn't exist.** Schema changes go through
   Drizzle (`add-a-table.md`); not a page-family commit.
4. **A `git pull` produces a divergence.** Don't `--rebase` blind;
   stop and report.
5. **A secret is missing from CI.** Don't invent one; report which
   workflow fails and which secret is needed.
6. **The design and the URL contract conflict** in a way you can't
   reconcile by trusting the URL contract. (Almost never — the URL
   contract is locked.)

For everything else — design ambiguity, empty data, missing brief,
chart that doesn't exist, copy that's not in the brief — **decide
and ship**. Document the call. Move on.

## 11. Quick reference

```bash
# Where you read
Z:/tickpedia/plan/steps/05_design_handoff_and_urls.md   # status block
Z:/tickpedia/plan/phases/phase_<N>_<topic>.md           # brief
Z:/tickpedia/plan/design/art-*.jsx                      # design mockup
apps/web/src/pages/tick/                                # template

# Where you write (tickpedia)
apps/web/src/pages/<family>/
apps/web/src/ssr/prefetch/<family>.ts
apps/web/src/App.tsx                                    # router arms
apps/e2e/src/scenarios/<family>/
apps/e2e/src/fixtures/page-reads.ts

# Where you write (plan)
plan/steps/05_design_handoff_and_urls.md                # tick boxes
plan/phases/phase_<N>_<topic>.md                        # brief if generated

# Verify
pnpm typecheck && pnpm test --run
pnpm --filter @tickpedia/e2e exec playwright test scenarios/<family>
pnpm verify                                             # full gate

# Commit (no Co-Authored-By, no emojis)
git add <explicit files>
git commit -m "$(cat <<'EOF'
feat(web): <family> page family — phase <N>
...
EOF
)"
git push origin main
```
