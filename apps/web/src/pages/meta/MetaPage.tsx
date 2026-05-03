import type { ReactNode } from 'react'
import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import type { TopLevelSection } from '../shared/index.js'

// Skeleton for the static meta surfaces — /about, /sources, /contribute.
// Page-shaped content with a hero band + body sections; reads no
// SemiLayer data, so it renders synchronously and the prerender writes
// it once at build time.

export interface MetaPageProps {
  /** Long-form title — "About" / "Sources" / "Contribute". */
  title: string
  /** Eyebrow above the H1. */
  eyebrow: string
  /** One-sentence summary; doubles as meta description. */
  lede: string
  /** Path component, e.g. "/about". */
  canonicalPath: string
  /** Top-level nav section to highlight (defaults to none). */
  active?: TopLevelSection
  /** Body — the page-specific sections. */
  children: ReactNode
}

export function MetaPage({
  title,
  eyebrow,
  lede,
  canonicalPath,
  active,
  children,
}: MetaPageProps) {
  useDocumentHead({
    title: `${title} | Tickpedia`,
    description: lede,
    canonicalPath,
  })

  return (
    <div className="tp-page" data-testid={`meta-${title.toLowerCase()}`}>
      <PageHeader {...(active ? { active } : {})} />

      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: title },
          ]}
        />
      </div>

      <div className="tp-meta-hero">
        <div className="ui eyebrow">{eyebrow}</div>
        <h1 className="tp-serif">{title}</h1>
        <p className="tp-serif lede">{lede}</p>
      </div>

      <div className="tp-meta-body">{children}</div>

      <Footer />
    </div>
  )
}
