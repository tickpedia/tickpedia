import { clerkClient, clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { parseAllowedEmails, isAllowedEmail } from './lib/allowlist'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/forbidden'])

// The default Clerk session JWT does not include the user's email, so we
// fetch it server-side. One Clerk API call per protected request, which
// is fine for a 2-person admin. Configuring a custom session token in
// the Clerk dashboard would let us read it from sessionClaims instead.
export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return

  const { userId, redirectToSignIn } = await auth()
  if (!userId) return redirectToSignIn()

  const user = await (await clerkClient()).users.getUser(userId)
  const email = user.primaryEmailAddress?.emailAddress ?? null

  const allowed = parseAllowedEmails(process.env.ADMIN_ALLOWED_EMAILS)
  if (!isAllowedEmail(email, allowed)) {
    const url = req.nextUrl.clone()
    url.pathname = '/forbidden'
    return NextResponse.rewrite(url)
  }
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
}
