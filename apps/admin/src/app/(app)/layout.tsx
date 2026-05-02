import type { ReactNode } from 'react'
import { currentUser } from '@clerk/nextjs/server'
import Shell from '../components/Shell'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress ?? null
  return <Shell email={email}>{children}</Shell>
}
