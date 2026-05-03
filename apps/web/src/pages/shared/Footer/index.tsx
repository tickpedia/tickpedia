// Global footer — sits below the page body on every entity page.
//
// Three logical groups: "About" (mission + GitHub), "Browse" (the
// meta routes from the URL contract — /sources, /about, /contribute),
// and "Data" (attribution to CDC + Census + USDA). Renders as
// columns on desktop, stacks on mobile via the `.tp-footer-grid`
// class in tokens.css.
//
// Build year auto-derives so we don't ship a stale copyright after
// 2026; the DEFAULT_NOW seam keeps tests deterministic.

export interface FooterProps {
  /** Override "now" in tests so the year assertion is stable. */
  now?: Date
}

export function Footer({ now }: FooterProps = {}) {
  const year = (now ?? new Date()).getFullYear()
  return (
    <footer className="tp-footer ui" data-testid="site-footer">
      <div className="tp-footer-grid">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Tickpedia</div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)' }}>
            A field guide to ticks, the diseases they carry, and how to get them off you.
            Open source — MIT.
          </p>
          <p style={{ margin: '10px 0 0', fontSize: 13 }}>
            <a href="https://github.com/tickpedia/tickpedia" rel="noreferrer">
              github.com/tickpedia/tickpedia
            </a>
          </p>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Browse</div>
          <ul className="tp-footer-list">
            <li><a href="/ticks">Ticks</a></li>
            <li><a href="/diseases">Diseases</a></li>
            <li><a href="/techniques">Techniques</a></li>
            <li><a href="/risk">Risk map</a></li>
            <li><a href="/facts">Wild facts</a></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Project</div>
          <ul className="tp-footer-list">
            <li><a href="/about">About</a></li>
            <li><a href="/sources">Sources</a></li>
            <li><a href="/contribute">Contribute</a></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Data</div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
            Surveillance data: <a href="https://www.cdc.gov/ticks/" rel="noreferrer">CDC</a>.
            Geographic centroids: US Census Bureau Gazetteer.
            One-liners and editorial copy: this project, with citations on every fact.
          </p>
        </div>
      </div>

      <div className="tp-footer-bottom" data-testid="footer-bottom">
        <span>{`© ${year} Tickpedia contributors · MIT`}</span>
        <span>
          Not medical advice — see <a href="/about#medical">about</a> for the limits.
        </span>
      </div>
    </footer>
  )
}
