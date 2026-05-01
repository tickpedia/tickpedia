// Tickpedia admin is locked to a fixed allowlist (2 people). Anyone whose
// primary email isn't in ADMIN_ALLOWED_EMAILS gets bounced by middleware,
// even if they successfully sign in via Clerk.

export function parseAllowedEmails(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0)
}

export function isAllowedEmail(email: string | null | undefined, allowed: string[]): boolean {
  if (!email) return false
  return allowed.includes(email.trim().toLowerCase())
}
