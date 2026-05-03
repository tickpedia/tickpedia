// Static 4-card "Start somewhere" grid. Editorial — written into the
// component, not read from a lens. Per the design.

const CARDS: ReadonlyArray<{ title: string; href: string; subtitle: string }> = [
  {
    title: 'I think I was bitten',
    href: '/techniques/fine-tipped-tweezers',
    subtitle: 'How to remove a tick',
  },
  {
    title: 'What lives in my state',
    href: '/states',
    subtitle: 'State-by-state surveillance',
  },
  {
    title: 'Tick season near me',
    href: '/season',
    subtitle: 'Monthly seasonality',
  },
  {
    title: 'What is alpha-gal?',
    href: '/diseases/alpha-gal-syndrome',
    subtitle: 'A red-meat allergy from a tick',
  },
]

export function QuickStartSection() {
  return (
    <section className="tp-section" data-testid="home-quickstart">
      <div className="head">
        <h2 className="tp-serif">Start somewhere</h2>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {CARDS.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="hairline ui"
            style={{
              padding: '16px 14px',
              color: 'var(--ink)',
              textDecoration: 'none',
              background: 'var(--surface)',
              display: 'block',
              borderRadius: 8,
            }}
          >
            <div className="tp-serif" style={{ fontSize: 18, lineHeight: 1.2 }}>
              {card.title}
            </div>
            <div
              className="mono"
              style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}
            >
              {card.subtitle}
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
