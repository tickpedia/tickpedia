// The minimum a page tells the SEO layer about itself. Both the
// build-time prerender (full head injection) and the runtime
// `useDocumentHead` (mutates title / canonical / description on
// client navigation) read the same shape, so per-page logic only
// has one builder to maintain.

export interface PageHead {
  /** Full <title>. Convention: `${entity} — ${section} | Tickpedia`. */
  title: string
  /** Plain-text meta description. ≤160 chars; truncate at the source. */
  description: string
  /** Path component of the canonical URL (e.g. `/ticks/lone-star-tick`). */
  canonicalPath: string
  /**
   * Optional path to a per-page OG image. Defaults to a site-wide
   * fallback at `/og-default.png` when omitted.
   */
  ogImagePath?: string
  /**
   * Optional schema.org payload(s). Pass one object or a list; each
   * gets rendered as its own `<script type="application/ld+json">`.
   */
  jsonLd?: object | object[]
}
