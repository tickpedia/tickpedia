// Encyclopedia-style breadcrumb. Each item except the last is a link;
// the last is the current page name (no link).

export interface CrumbItem {
  label: string
  /** When omitted, the item renders as the current page (no link). */
  href?: string
}

export interface CrumbProps {
  items: readonly CrumbItem[]
}

export function Crumb({ items }: CrumbProps) {
  return (
    <nav className="tp-crumb" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={`${i}-${item.label}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {item.href && !isLast ? <a href={item.href}>{item.label}</a> : <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>}
            {!isLast && <span className="sep" aria-hidden>/</span>}
          </span>
        )
      })}
    </nav>
  )
}
