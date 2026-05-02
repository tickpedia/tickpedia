# Skill: ship-a-step

> **Full autonomy.** When the user says "ship step N" or "execute step N"
> (or "ref ship-a-step and do step N"), you have authority to take it
> end-to-end with no further back-and-forth: build, write unit tests,
> write e2e tests when the change touches a web app, sync the DB,
> push SemiLayer, commit, push. The user is not reviewing intermediate
> work — they'll read the commit + plan diff after.

You are an agent shipping plan-tracked steps in the Tickpedia repo
(`Z:\tickpedia\tickpedia`, public, github.com/tickpedia/tickpedia). The
canonical plan lives in the sibling repo `Z:\tickpedia\plan\` (separate
git repo). Each step (`plan/steps/NN_<topic>.md`) has a "Definition of
done" checklist; your job is to flip the open boxes, write the code,
prove it, and check them off.

The vibe is **heads down, get it done, no questions asked** — *unless*
something genuinely warrants a question (an architectural fork the plan
didn't anticipate, a destructive op, a missing secret). The bar for
asking is high: silently solving an ambiguous case the wrong way costs
the user more than a single clarifying question, but every avoidable
question costs them a context switch. Default to deciding and shipping.

---

## Hard rules (the user dictated these — do not relax)

1. **Commit and push without `Co-Authored-By:`** — neither in the
   trailer nor inline. Plain message bodies only. The user's commit
   history is theirs; agent attribution lines do not belong in it. This
   is enforced by `agents.md` and a memory entry.

2. **No emojis** in code, comments, commit messages, docs, or PR bodies
   unless the user explicitly asks. Same for the plan-repo commits.

3. **DB schema changes go through Drizzle, not raw SQL hacks.**
   - Edit `db/src/schema.ts`.
   - `pnpm --filter @tickpedia/db db:generate` to produce a migration
     in `db/migrations/`.
   - **Hand-edit the migration if you need a backfill** before the
     `DROP COLUMN` / `SET NOT NULL` step (see
     `db/migrations/0003_faulty_network.sql` for the canonical pattern
     — `INSERT INTO new_table SELECT … FROM old_column` *then* the drop).
   - Commit the migration alongside the schema change.

4. **Local DB must be running before you migrate or seed.**
   - Check: `docker ps` should show `tickpedia-postgres` healthy on
     host port `15432`. (Not `5432` — that's likely a different
     project's container.)
   - If it's not up: `pnpm db:up`. Compose declares the volume
     `docker_tickpedia_pg_data`; bringing the container up against an
     existing volume is non-destructive.
   - If `db:up` recreates a container that was running on a different
     port from a stale config, the data volume survives. Verify with
     a sanity query before reseeding.

5. **Apply schema + seed locally, then remote.** The order matters
   because if local migration explodes, you haven't touched Neon yet.
   ```bash
   pnpm db:setup:local      # boots docker pg, migrates, seeds (one shot)
   pnpm db:setup:remote     # migrates + seeds against the .env DATABASE_URL (Neon)
   ```
   Both commands are idempotent (`onConflictDoNothing` /
   `onConflictDoUpdate` in the seed). Re-running them is safe.

6. **SemiLayer changes get pushed *and* the client gets regenerated.**
   ```bash
   pnpm semilayer:push        # apply sl.config.ts to the SemiLayer service
   pnpm semilayer:generate    # regen ./generated/semilayer
   ```
   If you changed the schema in a non-additive way (rename, type
   change), follow with:
   ```bash
   pnpm exec semilayer dangerously sync --rebuild
   ```
   The rebuild reindexes from scratch. Safe to run; the cost is
   embedding tokens.

7. **Unit tests are mandatory.** Pure-function logic gets Vitest
   coverage colocated under `__tests__/` next to the code:
   `db/src/__tests__/<x>.test.ts`,
   `apps/admin/src/lib/__tests__/<x>.test.ts`,
   `apps/web/src/components/__tests__/<x>.test.tsx`. Run with
   `pnpm --filter @tickpedia/<pkg> test -- --run`. Tests exercise corner
   cases (every reject branch, every edge of a state machine, every
   degenerate input). They land in the same commit as the feature.

8. **E2E is mandatory when the change touches a web app.** "Web app"
   here means `apps/web` (public site) or `apps/admin` (admin panel)
   surface, including a server-action change visible from the browser.
   - Add a Playwright spec under `apps/e2e/src/<area>.spec.ts` (or extend
     the most relevant existing one).
   - The harness is **hermetic** — it boots its own preview server on
     a private port. You do NOT need `pnpm dev` running.
   - Run with `pnpm e2e` (or `pnpm --filter @tickpedia/e2e exec
     playwright test --grep '<spec name>' --workers=1` for a single
     spec).
   - See `skills/run-e2e.md` for the full debugger workflow.

9. **Don't restart the user's dev servers.** They may have `pnpm dev`
   running on `5173` (web), `3000` (admin), or others. The e2e harness
   is hermetic and uses a different port (`4173` by default — override
   with `E2E_WEB_PORT` if it collides). Never `kill` a process you
   didn't start.

10. **Don't drag in stray working-tree changes.** The user often has
    in-progress edits in the tree (e.g. a Google Tag Manager block in
    `apps/web/index.html`, `apps/admin/tsconfig.tsbuildinfo`). When
    staging, list files explicitly:
    ```bash
    git add db/src/x.ts apps/admin/src/y.tsx     # good
    git add -A                                    # bad — unless you've
                                                  # confirmed the tree is clean
    ```
    `git status --short` first; if you see anything you didn't touch,
    leave it alone.

11. **Imports are batched (CDC) and idempotent (everything).** If you
    add a new ingest path, follow the pattern in
    `db/src/ingest/cdc-county-import.ts`: collect rows in memory, upsert
    in chunks of 500 with `onConflictDoUpdate` on a natural-key unique
    index. See `skills/import-xlsx.md` for the full reasoning (Vercel
    function timeouts, Neon round-trip math).

12. **No `--no-verify`, no force-push, no `git reset --hard` of the
    user's branch.** If a hook fails, fix the underlying cause and
    create a *new* commit. If you genuinely need to force-push (e.g. a
    rebase you're sure about), stop and ask first.

---

## Repo geography (you will likely touch all of these)

| Path | Purpose |
|---|---|
| `apps/web/src/` | Public site (Vite + React → GitHub Pages) |
| `apps/admin/src/app/` | Admin (Next.js App Router + Clerk → Vercel) |
| `apps/admin/src/lib/` | Server-side helpers (xlsx parser, semilayer-notify, allowlist, relations) |
| `apps/e2e/src/` | Playwright specs + the hermetic harness |
| `db/src/schema.ts` | Drizzle schema — single source of truth |
| `db/src/seed.ts` + `db/src/seeds/` | Seed data (canonical ticks, diseases, removal techniques, FIPS overrides) |
| `db/src/ingest/` | xlsx parsers + ingest functions (batched upserts) |
| `db/migrations/` | drizzle-kit-generated SQL + your hand-edits for backfill |
| `sl.config.ts` | SemiLayer lens / feed / analyze config |
| `packages/ui/` | Shared React components (e.g. `TickHero`) |
| `skills/` | Agent how-tos. Add one when a workflow shows up twice. |
| **`Z:\tickpedia\plan\steps\NN_…md`** | The step you're shipping |

---

## The loop

### 0. Read the plan + the boundary docs

- `Z:\tickpedia\plan\steps\NN_<topic>.md` — the step you're shipping.
  Read it end to end before touching code.
- `agents.md` (in this repo) — conventions and skill index.
- `CLAUDE.md` (in this repo) — quick reference + rules.
- `MEMORY.md` (in your auto-memory) — durable user preferences.

If the step references other steps as prerequisites, glance at those
too. Never assume you remember a step you haven't re-read in the
current session.

### 1. Plan the diff

`TaskCreate` one task per "Definition of done" checkbox plus terminal
tasks for tests + e2e + commit. Mark `in_progress` as you start each
slice; mark `completed` only when typecheck + tests are green for that
slice.

### 2. Build it, package by package

Faster than the full turbo run while you're iterating:

```bash
pnpm --filter @tickpedia/db typecheck
pnpm --filter @tickpedia/admin typecheck
pnpm --filter @tickpedia/web typecheck
pnpm --filter @tickpedia/e2e typecheck
```

Run unit tests next to the code you just touched:

```bash
pnpm --filter @tickpedia/db test -- --run
```

### 3. Sync the local DB if schema changed

```bash
docker ps | grep tickpedia-postgres   # confirm running
pnpm db:up                            # if not
pnpm db:setup:local                   # migrate + seed against localhost:15432
```

Verify with `docker exec tickpedia-postgres psql -U tickpedia -d
tickpedia -c "\d <table>"` or a sanity query.

### 4. Sync remote (Neon)

```bash
pnpm db:setup:remote
```

This reads `DATABASE_URL` from `.env` (Neon pooled HTTP host —
`*.aws.neon.tech`). It runs the migration and reseeds. Re-running is
idempotent.

If you only changed seed data (no migration), just:

```bash
pnpm --filter @tickpedia/db run db:seed
```

### 5. SemiLayer sync if `sl.config.ts` changed

```bash
pnpm semilayer:push
pnpm semilayer:generate
```

Then re-run typecheck — the regenerated client may surface type changes
in `apps/web` (consumers).

If you renamed a lens or removed a field:
```bash
pnpm exec semilayer dangerously sync --rebuild
```

Smoke-test that the lenses are queryable end-to-end:

```bash
pnpm semilayer:smoke
```

### 6. Write the e2e (web app changes only)

Add or extend `apps/e2e/src/<area>.spec.ts`. The harness already
provides:

- A hermetic Playwright config that boots the web preview.
- `getByRole` / `getByTestId` is preferred over CSS selectors.
- `await expect(...).toBeVisible()`, never `waitForTimeout`.

Run:

```bash
pnpm e2e
```

Or a single spec while debugging:

```bash
pnpm --filter @tickpedia/e2e exec playwright test --grep '<spec>' --workers=1
```

Iterate to green. If `apps/e2e/playwright-report/index.html` fails to
auto-open, open it manually for the trace viewer.

### 7. Full-workspace gate

Before you commit:

```bash
pnpm typecheck
pnpm test
pnpm e2e          # only if web/admin changed
```

All three must be green. If they aren't, fix the underlying issue —
don't paper over it with a skip.

### 8. Update the plan

In `Z:\tickpedia\plan\steps\NN_<topic>.md`:

- Flip every shipped `[ ]` to `[x]` with a one-line note (file paths,
  contract, gotchas).
- If the step has a status snapshot at the top, update the date.
- If you discovered a follow-up the plan didn't list, append it under a
  "Follow-ups" section rather than silently absorbing it.

### 9. Commit + push (tickpedia repo)

Stage explicitly. Conventional commit subject; body in 4–8 bullets
describing **what shipped** and what it lets the user do, not what each
file does. **No `Co-Authored-By:` trailer.**

```bash
git add <files>
git commit -m "$(cat <<'EOF'
feat(<scope>): <one-line — no step language>

- <thing 1 — what it does, what the user can now do>
- <thing 2>
- …
EOF
)"
git push origin main
```

Vercel auto-deploys admin from `main`. GitHub Pages auto-deploys web
from `main`. Confirm the deploy went green if the change is
user-facing.

### 10. Commit + push (plan repo)

The plan repo is a separate concern. Plan-repo commits can be terse:

```bash
cd Z:/tickpedia/plan
git add steps/NN_<topic>.md
git commit -m "step NN: ship <subset> — <one-line>"
git push origin main
```

---

## Public-surface hygiene

Tickpedia is a public repo. Keep the history clean for future
maintainers and casual readers:

- **No "step N" / "phase X" markers in code comments.** Step numbers
  are scaffolding for the plan repo. Code should describe the
  *behavior*, not the planning artifact.
- **Commit messages describe what shipped, not the plan's numbering.**
  Bad: `feat(admin): finish step 03 phase 2`. Good: `feat(admin):
  expected-shape cards on xlsx imports + silently skip bogus CDC FIPS`.
- **The plan repo is where step / phase tracking lives.** Reference
  step numbers freely there.

---

## Failure mode: stop and ask

If you've burned ~3 iterations on a green build / e2e and the symptom
keeps moving (or you can't reproduce locally what CI is doing), **stop
and report**. Cite what you've tried, what the hypothesis is, and what
you'd try next. Don't sleep-loop, don't paper over with retries, don't
silently disable the failing assertion. The user's time is more
valuable than the residual percentage.

Same for **scope ambiguity**: if you find a checkbox the plan
underspecifies in a way you can't decide between two equally
defensible options, ship the cheaper option and flag the call in the
commit body + plan update. Don't ask before deciding unless the cost
of the wrong call is high (production data, security, breaking the
public-site contract).

---

## When *to* ask (these warrant a question)

- The plan asks you to delete a table / drop a column **and** the
  schema has live production data not covered by the migration's
  backfill.
- A SemiLayer change requires `dangerously sync --rebuild` against
  prod. Mention the embedding cost and confirm.
- A `git push --force` is genuinely the right answer (rare; the user
  pushes to `main` directly so this almost never comes up).
- A secret is missing from `.env` and the plan can't proceed. (Don't
  invent one; don't read another secret to bootstrap.)
- The plan references a file or directory that doesn't exist and
  there's no obvious replacement.

For everything else: decide, ship, document the call in the commit
body.

---

## Persona invocation

The user typically says one of:

> "Ship step 03."
> "Execute step 04."
> "Ref ship-a-step and do step 02."

Sometimes with a scope hint:

> "Ship step 04, but skip the precomputed analyses — feeds first."
> "Execute step 03, only the diseases bucket."

Treat the hint as authoritative — the plan is a default scope, the
user's hint can carve it down. If the hint **expands** scope ("also
do…") and the addition isn't trivial, push back briefly and confirm.

The user opens a fresh conversation between steps. Each invocation is
self-contained — re-read the plan, re-confirm the open boxes, then
ship.

---

## Quick reference (the commands you'll run most)

```bash
# DB
pnpm db:up                                     # boot local pg on :15432
pnpm db:setup:local                            # migrate + seed local
pnpm db:setup:remote                           # migrate + seed Neon
pnpm --filter @tickpedia/db db:generate        # generate migration from schema diff
pnpm --filter @tickpedia/db run db:seed        # seed only (uses .env DATABASE_URL)

# SemiLayer
pnpm semilayer:push                            # apply config
pnpm semilayer:generate                        # regen Beam client
pnpm semilayer:smoke                           # smoke test all lenses
pnpm exec semilayer dangerously sync --rebuild # nuclear: full reindex

# Tests
pnpm typecheck                                 # workspace
pnpm test                                      # workspace
pnpm e2e                                       # hermetic Playwright
pnpm --filter @tickpedia/<pkg> test -- --run   # one package, one shot
pnpm --filter @tickpedia/<pkg> typecheck       # one package

# Verify
docker ps                                      # is local pg up?
docker exec tickpedia-postgres psql -U tickpedia -d tickpedia -c "<sql>"

# Commit
git status --short                             # what's actually staged
git add <explicit files>                       # not -A
# heredoc commit, no co-author trailer
```
