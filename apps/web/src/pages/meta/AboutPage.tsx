import { MetaPage } from './MetaPage.js'

// /about — what the project is, why it exists, who's behind it,
// license, and the medical disclaimer (anchored at #medical so the
// footer's "see about for the limits" link lands directly on the
// disclaimer block).

export function AboutPage() {
  return (
    <MetaPage
      title="About"
      eyebrow="Field guide"
      lede="Tickpedia is an encyclopedia of ticks, the diseases they carry, and how to get them off you. Open source, MIT-licensed."
      canonicalPath="/about"
    >
      <section className="tp-section">
        <h2 className="tp-serif">What this is</h2>
        <p>
          A regional field guide for the United States. Every page
          consolidates surveillance data, scientific names, and
          plain-language guidance for one tick, one disease, one
          removal technique, or one place. The goal is the page you
          wish you had when you found a tick on your kid.
        </p>
        <p>
          Public surveillance data is the backbone — CDC, the Census
          Bureau, state public health departments. The editorial
          layer (one-liners, removal steps, wild facts) is written
          and reviewed by the project's contributors, with citations
          on every claim that isn't a raw count.
        </p>
      </section>

      <section className="tp-section">
        <h2 className="tp-serif">Open source</h2>
        <p>
          Tickpedia is licensed MIT and developed in public at{' '}
          <a href="https://github.com/tickpedia/tickpedia" rel="noreferrer">
            github.com/tickpedia/tickpedia
          </a>
          . Pages are static HTML hosted on GitHub Pages — what you
          load is what your browser renders. The site uses Google
          Analytics (via Tag Manager) for aggregate pageview counts;
          no other third-party embeds.
        </p>
        <p>
          The read-side intelligence (search, related-content rails,
          "ticks established in this state") is powered by{' '}
          <a href="https://semilayer.com" rel="noreferrer">SemiLayer</a>
          , which the public site queries with a public read-only key.
        </p>
      </section>

      <section className="tp-section" id="medical">
        <h2 className="tp-serif">Not medical advice</h2>
        <p>
          Tickpedia describes ticks, the pathogens they carry, and the
          diseases those pathogens cause. It is <strong>not</strong> a
          substitute for medical advice. If you've been bitten and
          you're concerned — about the species, the duration of
          attachment, a developing rash, or your symptoms — call your
          healthcare provider or a regional poison control line. Do
          not rely on a static website to triage an active bite.
        </p>
        <p>
          The case counts and county-level surveillance you'll see
          here are aggregate, lagging indicators (the CDC drops them
          a year or more after collection). They tell you where ticks
          and diseases have been observed historically. They are{' '}
          <strong>not</strong> a real-time risk feed and will never
          be one.
        </p>
        <p>
          If you spot a factual error or a citation gap, please{' '}
          <a href="/contribute">open an issue or PR</a>.
        </p>
      </section>
    </MetaPage>
  )
}
