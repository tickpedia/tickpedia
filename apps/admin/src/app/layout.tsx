import type { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata = {
  title: 'Tickpedia Admin',
  description: 'Internal admin for tickpedia.com',
}

// Admin is fully behind auth. Skip static prerendering so we don't need
// Clerk credentials during build.
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
