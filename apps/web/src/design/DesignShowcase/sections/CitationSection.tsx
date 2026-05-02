import { Cite } from '../../Cite/index.js'

// Demonstrates the citation atom inline in editorial body copy. The
// monospace badge with a brick dot is the project's only citation
// pattern — never superscript numbers, never modal-only.

export function CitationSection() {
  return (
    <section style={{ marginTop: 56 }}>
      <div className="ui eyebrow" style={{ marginBottom: 14 }}>
        Citation atom
      </div>
      <p
        className="tp-serif"
        style={{ fontSize: 17, lineHeight: 1.55, margin: 0, maxWidth: 620 }}
      >
        Powassan virus can transmit in as little as fifteen minutes of
        attachment <Cite src="CDC" year="2024" url="https://www.cdc.gov/powassan/" />,
        far below the 36-hour window for Lyme{' '}
        <Cite src="NIH" year="2022" url="https://pubmed.ncbi.nlm.nih.gov/" />,
        which is why removal speed alone cannot eliminate risk{' '}
        <Cite src="UMass Ext." url="https://ag.umass.edu/" />.
      </p>
      <p
        className="ui"
        style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, maxWidth: 620 }}
      >
        Mono badge, brick dot, hover for the source title. Anchor element
        underneath — keyboard-focusable, screen-reader-readable as a real link.
      </p>
    </section>
  )
}
