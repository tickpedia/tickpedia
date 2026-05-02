// Inline citation atom: mono badge with a brick dot. Hover reveals the
// source URL via the title attribute. Used wherever the editorial voice
// makes a clinical claim — `<Cite src="CDC" year="2024" url="…" />`.
//
// Renders as a single `<a>` so it's keyboard-focusable and screen-
// readers see it as a real source link.

export interface CiteProps {
  src: string
  year?: number | string
  url?: string
}

export function Cite({ src, year, url }: CiteProps) {
  const title = `Source: ${src}${year ? `, ${year}` : ''}`
  return (
    <a
      className="tp-cite mono"
      href={url || '#'}
      target={url ? '_blank' : undefined}
      rel={url ? 'noreferrer' : undefined}
      title={title}
    >
      <span className="src">{src}</span>
      {year ? <span style={{ opacity: 0.7 }}>·{year}</span> : null}
    </a>
  )
}
