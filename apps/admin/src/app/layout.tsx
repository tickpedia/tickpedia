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

// Apply the persisted theme before React mounts to avoid a flash of the
// wrong palette. Runs once before hydration.
const themeBootstrap = `
try {
  const t = localStorage.getItem('tickpedia-admin-theme');
  if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
} catch {}
`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
