import { SignOutButton } from '@clerk/nextjs'

export default function Forbidden() {
  return (
    <main className="bare">
      <h1>Not on the list</h1>
      <p>
        This admin panel is locked to a two-person allowlist. If that&rsquo;s a mistake,
        ping the team.
      </p>
      <SignOutButton>
        <button>Sign out</button>
      </SignOutButton>
    </main>
  )
}
