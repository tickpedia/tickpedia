import { useEffect } from 'react'

// Mutates document.title + the `<link rel="canonical">` tag on mount.
// Static-build pages all share one index.html, so per-page metadata
// has to be applied client-side. SPA routing changes also re-fire
// this on the new page.
//
// Search engines that execute JS (Google, Bing) read the post-mutation
// values; ones that don't fall back to whatever ships in the static
// index.html. We accept that trade-off until / if we move to
// per-page prerendering.

export interface DocumentHeadOptions {
  /** Full <title> string. Convention: `${entity} — ${section} | Tickpedia`. */
  title: string
  /** Canonical path, no origin (e.g. `/ticks/blacklegged-tick`). */
  canonicalPath: string
  /** Optional meta description override. */
  description?: string
  /** Origin to prepend to canonical href. Defaults to the live origin. */
  origin?: string
}

const CANONICAL_ORIGIN = 'https://tickpedia.com'

export function useDocumentHead(opts: DocumentHeadOptions): void {
  const { title, canonicalPath, description, origin = CANONICAL_ORIGIN } = opts
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.title = title

    setOrCreateLink('canonical', `${origin}${canonicalPath}`)

    if (description) {
      setOrCreateMeta('description', description)
    }
  }, [title, canonicalPath, description, origin])
}

function setOrCreateLink(rel: string, href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', rel)
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

function setOrCreateMeta(name: string, content: string): void {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', name)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}
