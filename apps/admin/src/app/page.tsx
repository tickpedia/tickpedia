import { currentUser } from '@clerk/nextjs/server'

export default async function Home() {
  const user = await currentUser()
  return (
    <main>
      <h1>Tickpedia Admin</h1>
      <p>Signed in as {user?.primaryEmailAddress?.emailAddress ?? 'unknown'}.</p>
      <p>Two-person allowlist enforced by middleware. Welcome.</p>
    </main>
  )
}
