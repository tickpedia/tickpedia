import { TickCrest, Wordmark } from '@tickpedia/ui'
import type { EntityKind } from '../../../routes/index.js'

// Sticky top nav + brand mark + global search slot. Used by every page
// outside the showcase. The `active` prop drives the aria-current
// highlight for the matched section.

export interface PageHeaderProps {
  /** Top-level section to highlight. Defaults to no highlight. */
  active?: TopLevelSection
}

export type TopLevelSection =
  | 'home'
  | 'ticks'
  | 'diseases'
  | 'techniques'
  | 'risk'
  | 'facts'
  | 'sources'

interface NavLink {
  section: TopLevelSection
  label: string
  href: string
}

const NAV_LINKS: readonly NavLink[] = [
  { section: 'home',       label: 'Home',         href: '/' },
  { section: 'ticks',      label: 'Ticks',        href: '/ticks' },
  { section: 'diseases',   label: 'Diseases',     href: '/diseases' },
  { section: 'techniques', label: 'Techniques',   href: '/techniques' },
  { section: 'risk',       label: 'Risk map',     href: '/risk' },
  { section: 'facts',      label: 'Wild facts',   href: '/facts' },
  { section: 'sources',    label: 'Sources',      href: '/sources' },
]

export function PageHeader({ active }: PageHeaderProps) {
  return (
    <div className="tp-nav ui">
      <a href="/" className="tp-mark" aria-label="Tickpedia home">
        <TickCrest
          size="badge"
          colors={{ headColor: '#1c1814', bodyColor: '#8a2a1a', legColor: '#1c1814' }}
          common="Tickpedia"
          ringText={false}
        />
        <Wordmark />
      </a>
      <nav className="tp-nav-links" aria-label="Primary">
        {NAV_LINKS.map((link) => (
          <a
            key={link.section}
            href={link.href}
            aria-current={link.section === active ? 'page' : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

/**
 * Map a route's `EntityKind` to the top-level nav section it lives
 * under. Lets pages call `<PageHeader active={sectionFor(kind)} />`
 * without each one hardcoding the relationship.
 */
export function sectionFor(kind: EntityKind): TopLevelSection | undefined {
  if (kind === 'home') return 'home'
  if (kind.startsWith('tick')) return 'ticks'
  if (kind.startsWith('disease')) return 'diseases'
  if (kind.startsWith('technique')) return 'techniques'
  if (kind === 'risk' || kind === 'risk-disease') return 'risk'
  if (kind.startsWith('fact')) return 'facts'
  if (kind === 'sources') return 'sources'
  return undefined
}
