import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { parseAllowedEmails, isAllowedEmail } from './lib/allowlist'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/forbidden'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return

  const { userId, sessionClaims, redirectToSignIn } = await auth()
  if (!userId) return redirectToSignIn()

  const email =
    (sessionClaims?.email as string | undefined) ??
    (sessionClaims?.['primary_email'] as string | undefined) ??
    null

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
