# Skill: debug-admin

The admin (`admin.tickpedia.com`) is small but has a few moving parts —
Clerk auth, an email allowlist enforced in middleware, Vercel hosting,
Drizzle/Neon for data. This skill is the first place to look when:

- a known-good user gets bounced to `/forbidden`
- sign-in fails or loops
- a deploy is "green" but the live site behaves wrong
- an admin route 500s

## TL;DR — the four checks, in order

1. **Read the middleware.** `apps/admin/src/middleware.ts` is the
   chokepoint. Every auth/allowlist bug surfaces there.
2. **Confirm what's in `sessionClaims`.** Add a one-line log; redeploy
   to a preview; sign in; read the runtime log. If `email` is missing,
   the JWT template needs configuring (see "Clerk session token gotcha").
3. **Check `ADMIN_ALLOWED_EMAILS` on Vercel** matches the email Clerk
   has for the user. Easy to confuse `me@dave.blue` vs `truleydave@gmail.com`.
4. **Check the deploy actually shipped.** Latest production deploy
   `Ready`? Build env vars present? Logs clean?

The code-level checks (1, 2) are usually the answer. (3, 4) catches the
"oh, the value is empty" or "old build is live" class of bug.

## The Clerk session token gotcha

> **By default, Clerk's session JWT does NOT include the user's email.**

The default claims are `sub` (user id), `sid` (session id), `iat`,
`exp`, `azp`, `nbf`. No `email`, no `primary_email`. So this is broken:

```ts
// middleware.ts — looks reasonable, doesn't work
const email = sessionClaims?.email as string | undefined
```

Two ways to make `email` actually arrive:

**A. Custom session token (Clerk dashboard, no code).** In the Clerk
dashboard → *Sessions* → *Customize session token*, add:

```json
{ "email": "{{user.primary_email_address}}" }
```

Then `sessionClaims.email` works as written. No DB round-trip per
request. This is the recommended fix for our admin.

**B. Server-side user fetch (code only, no dashboard).**

```ts
import { clerkClient } from '@clerk/nextjs/server'

const user = await (await clerkClient()).users.getUser(userId)
const email = user.primaryEmailAddress?.emailAddress ?? null
```

One extra Clerk API call per protected request, but no hidden
dashboard config. Pick this if you want everything to live in git.

The unit test in `apps/admin/src/lib/__tests__/allowlist.test.ts`
covers `parseAllowedEmails` / `isAllowedEmail` but **does not** cover
the Clerk integration in `middleware.ts`. Adding an integration test
that mocks `auth()` and verifies the rewrite is the right follow-up.

## The allowlist mismatch trap

`ADMIN_ALLOWED_EMAILS` is whitespace-trimmed and lowercased on both
sides (`parseAllowedEmails` / `isAllowedEmail`). What it does *not*
do:

- alias resolution — `dave+admin@x` ≠ `dave@x`
- domain wildcards
- handle multiple emails per Clerk user (only the **primary** is checked)

If a user has `truleydave@gmail.com` as their Clerk primary but the
allowlist says `me@dave.blue`, they get bounced. The fix is one of:

- add the user's primary to `ADMIN_ALLOWED_EMAILS` (in `.env` for
  local, in Vercel + GitHub Actions secrets for prod)
- or change the user's Clerk primary email to one that's already on
  the list

Don't make the allowlist comparison "smart" (case-folded *plus*
plus-stripped, etc.). The whole point is "two specific people", and
fuzziness creates surprise admits.

## Vercel: the project, env vars, and deploys

We deploy `apps/admin` to **`snapshot-app/tickpedia-admin`** on Vercel,
aliased to `admin.tickpedia.com`.

You need a personal access token. The user keeps it in
`.env` as `VERCEL_TOKEN` (gitignored). Generate at
https://vercel.com/account/tokens — scope it tightly, short expiry.

Vercel CLI doesn't like running outside a linked directory, so use a
temp dir to avoid creating `.vercel/` in the repo:

```bash
set -a && source .env && set +a    # exports VERCEL_TOKEN
mkdir -p /tmp/vercel-debug
pnpm dlx vercel link --yes --project tickpedia-admin \
  --token "$VERCEL_TOKEN" --cwd /tmp/vercel-debug
```

Then from that dir you can run any of:

```bash
# Recent deployments — look for the latest production "Ready"
pnpm dlx vercel ls tickpedia-admin --token "$VERCEL_TOKEN" --cwd /tmp/vercel-debug

# Inspect a specific deployment (status, builds, aliases)
pnpm dlx vercel inspect <url> --token "$VERCEL_TOKEN" --cwd /tmp/vercel-debug

# Runtime logs (last hour, follow with -f)
pnpm dlx vercel logs <url> --token "$VERCEL_TOKEN" --cwd /tmp/vercel-debug

# List env var NAMES (cannot read sensitive values — see note below)
pnpm dlx vercel env ls --token "$VERCEL_TOKEN" --cwd /tmp/vercel-debug

# Pull the production env file — empty value = "Sensitive" var, not unset
pnpm dlx vercel env pull /tmp/vercel-debug/.env.production \
  --environment production --token "$VERCEL_TOKEN" --cwd /tmp/vercel-debug
```

> **Sensitive vs Encrypted.** Vercel env vars created as *Sensitive*
> (which most of ours are) cannot be read back via `env pull` — they
> come down as empty strings. **Empty in `env pull` does NOT mean
> empty in the running deploy.** If you need to verify a value, do it
> by exercising the deploy (sign in, hit an endpoint, watch logs) or
> by editing it in the dashboard.

If a deploy didn't happen when you expected one: the GitHub Action
in `.github/workflows/deploy-admin.yml` only runs on changes to
`apps/admin/**`, `db/**`, `pnpm-lock.yaml`, or that workflow file —
it's a *preflight build*, not the actual deploy. The deploy itself is
done by Vercel's GitHub integration and ignores the path filters.

## Reproducing locally (faster than redeploying)

```bash
pnpm --filter @tickpedia/admin dev   # → http://localhost:3001
```

`.env` already has Clerk + allowlist values. Sign in with the same
account that's bouncing in prod — if it bounces locally too, it's a
code/config bug, not a Vercel-only problem.

To prove the email shape, drop a temporary log into middleware:

```ts
console.log('[admin/middleware] claims=', JSON.stringify(sessionClaims))
```

Hit any protected route. Inspect the dev terminal. Remove the log
before committing.

## Common errors

| Symptom | Likely cause | Fix |
|---|---|---|
| Signed in, bounced to `/forbidden` | `sessionClaims.email` is undefined (Clerk default) | Configure Clerk session token (option A above) |
| Signed in, bounced to `/forbidden`, claims have email | User's primary email not in `ADMIN_ALLOWED_EMAILS` | Update Vercel env var + GH secret + redeploy |
| Sign-in loops back to `/sign-in` | Clerk publishable/secret mismatch (test vs prod keys) | Both keys must be from the same Clerk instance |
| `Missing publishableKey` at build | Vercel env var truly absent (or wrong scope: Preview vs Production) | Add it in the right env scope and redeploy |
| Admin loads but DB calls fail | `DATABASE_URL` missing in Vercel env (admin imports `@tickpedia/db`) | Set `DATABASE_URL` in Vercel, redeploy |
| `vercel env pull` returns empty values | Vars are Sensitive type — values cannot be read back | Verify by exercising the deploy or editing in dashboard |
| Unit tests pass, prod still wrong | `allowlist.test.ts` covers parsing, not the Clerk wiring | Add an integration test that mocks `auth()` |

## Don'ts

- Don't bypass the allowlist with a backdoor flag. The whole admin is
  two people by design.
- Don't `console.log(sessionClaims)` in production middleware. It's
  fine for one debug deploy; pull it before merging.
- Don't commit `.vercel/` (it's gitignored, but the temp-dir trick
  above keeps it out of the repo entirely).
- Don't switch `parseAllowedEmails` to be fuzzier (plus-stripping,
  domain wildcards) without a Decision in the bootstrap doc — the
  point of an allowlist is precision.
