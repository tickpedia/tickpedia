'use client'

// Two-panel admin shell.
//
//   - Desktop: fixed sidebar on the left, content on the right.
//   - Mobile: sidebar collapses to a slide-in drawer toggled by a
//     hamburger button in a sticky topbar.
//
// Theme toggle persists to localStorage; the bootstrap script in
// app/layout.tsx applies it before hydration to avoid flashing.
//
// Active link state is derived from `usePathname` so refreshing into a
// deep route still highlights the right item.

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import { SignOutButton } from '@clerk/nextjs'

// `href` is typed against Next's typed-routes (literal strings only).
// We pin each nav link to a Route so the types stay precise; the runtime
// active-state check uses a plain string.
type Href = Route

interface NavItem {
  href: Href
  label: string
}

interface NavSection {
  heading: string
  items: NavItem[]
}

const NAV: NavSection[] = [
  {
    heading: 'Overview',
    items: [{ href: '/', label: 'Dashboard' }],
  },
  {
    heading: 'Data',
    items: [{ href: '/data', label: 'Locations' }],
  },
  {
    heading: 'Imports (xlsx/csv)',
    items: [
      { href: '/import/cdc-county', label: 'CDC disease counts' },
      { href: '/import/tick-county', label: 'Tick presence (county)' },
      { href: '/import/pathogen-county', label: 'Tick pathogens (county)' },
      { href: '/import/cdc-month', label: 'CDC monthly counts' },
      { href: '/import/lyme-county', label: 'Lyme cases (county × year)' },
    ],
  },
  {
    heading: 'Imports (JSON)',
    items: [
      { href: '/import/json/ticks', label: 'Ticks' },
      { href: '/import/json/diseases', label: 'Diseases' },
      { href: '/import/json/pathogens', label: 'Pathogens' },
      { href: '/import/json/facts', label: 'Wild facts' },
      { href: '/import/json/techniques', label: 'Removal techniques' },
    ],
  },
  {
    heading: 'Content',
    items: [
      { href: '/content/ticks', label: 'Ticks' },
      { href: '/content/diseases', label: 'Diseases' },
      { href: '/content/pathogens', label: 'Pathogens' },
      { href: '/content/facts', label: 'Wild facts' },
      { href: '/content/techniques', label: 'Removal techniques' },
    ],
  },
]

type Theme = 'auto' | 'light' | 'dark'

export default function Shell({
  children,
  email,
}: {
  children: ReactNode
  email: string | null
}) {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('auto')

  useEffect(() => {
    const t = (localStorage.getItem('tickpedia-admin-theme') ?? 'auto') as Theme
    setTheme(t)
  }, [])

  function applyTheme(t: Theme) {
    setTheme(t)
    if (t === 'auto') {
      delete document.documentElement.dataset.theme
      localStorage.removeItem('tickpedia-admin-theme')
    } else {
      document.documentElement.dataset.theme = t
      localStorage.setItem('tickpedia-admin-theme', t)
    }
  }

  function isActive(href: Href): boolean {
    const h = String(href)
    if (h === '/') return pathname === '/'
    return pathname === h || pathname.startsWith(h + '/')
  }

  // Find the current page's label so the mobile topbar shows it.
  const currentLabel =
    NAV.flatMap((s) => s.items).find((i) => isActive(i.href))?.label ?? 'Tickpedia Admin'

  return (
    <>
      <div className="topbar">
        <button
          className="hamburger"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open navigation"
        >
          ☰
        </button>
        <h2>{currentLabel}</h2>
      </div>
      <div className="shell">
        <aside className="sidebar" data-open={open ? 'true' : 'false'}>
          <h1>
            Tickpedia <span className="badge">Admin</span>
          </h1>
          {NAV.map((section) => (
            <div key={section.heading}>
              <div className="nav-section">{section.heading}</div>
              {section.items.map((item) => (
                <Link
                  key={String(item.href)}
                  href={item.href}
                  className={'nav-link ' + (isActive(item.href) ? 'active' : '')}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="sidebar-footer">
            <div>{email ?? 'unknown'}</div>
            <div className="theme-toggle" role="group" aria-label="Theme">
              {(['auto', 'light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  data-active={theme === t ? 'true' : 'false'}
                  onClick={() => applyTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <SignOutButton>
              <button className="secondary">Sign out</button>
            </SignOutButton>
          </div>
        </aside>
        <div className="scrim" data-open={open ? 'true' : 'false'} onClick={() => setOpen(false)} />
        <main className="main">{children}</main>
      </div>
    </>
  )
}
