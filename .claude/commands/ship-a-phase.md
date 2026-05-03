---
description: Ship the next unchecked phase of step 05 end-to-end (loop-friendly, autonomous)
---

You are invoked under the `ship-a-phase` skill — full autonomy, no
review checkpoint. Read `skills/ship-a-phase.md` end to end before
touching anything else; that file is the single source of truth for
this command. The user's standing instruction is **"more get-it-done,
less ask me questions."** Decide instead of asking; document the call
in the commit body.

Argument handling:
- No argument → ship the next `[ ]` row in the "Page families" block
  of `Z:/tickpedia/plan/steps/05_design_handoff_and_urls.md`
  (skipping the deferrable phase 5b unless it's the only one left).
- `phase <N>` → ship that specific phase regardless of order.
- `phase <N> dry-run` → emit the brief at
  `Z:/tickpedia/plan/phases/phase_<N>_<topic>.md` without committing
  any code (you may still commit the brief to the plan repo).

Procedure: §6 of `skills/ship-a-phase.md`. Hard rules: §7. Failure
modes (the only valid stop conditions): §10. Everything else — empty
data, design ambiguity, missing brief — **resolve and ship**.

When invoked under `/loop`, the user is not present at this tick. After
push, return cleanly so the next loop tick claims the next phase.

Argument: $ARGUMENTS
