import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'
import { Frame } from '../layout/Frame.js'

// The site-wide fallback OG card. Used when a page kind doesn't have a
// dedicated template yet, and as the actual /og-default.png that the
// SEO surface points at when ogPathFor returns null.
//
// Pure typography — wordmark large-and-centered, tagline below.

const HERO_WRAP: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
}

const WORDMARK_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontWeight: 500,
  fontSize: 96,
  letterSpacing: '-0.025em',
  color: OG_COLORS.ink,
  display: 'flex',
}

const TAGLINE_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontStyle: 'italic',
  fontWeight: 500,
  fontSize: 32,
  color: OG_COLORS.muted,
  marginTop: 18,
  display: 'flex',
}

const STRIP_STYLE: CSSProperties = {
  fontFamily: 'Geist',
  fontWeight: 500,
  fontSize: 18,
  letterSpacing: '0.14em',
  color: OG_COLORS.muted2,
  textTransform: 'uppercase',
  marginTop: 32,
  display: 'flex',
  gap: 24,
}

export interface DefaultTemplateInput {
  /** When the path text should appear above the wordmark (e.g. /risk). */
  pathLabel?: string
}

export function DefaultTemplate({ pathLabel }: DefaultTemplateInput = {}) {
  return (
    <Frame hideWordmark>
      <div style={HERO_WRAP}>
        {pathLabel && (
          <div style={{ ...STRIP_STYLE, marginTop: 0, marginBottom: 28 }}>{pathLabel}</div>
        )}
        <div style={WORDMARK_STYLE}>Tickpedia</div>
        <div style={TAGLINE_STYLE}>Ticks by region · Wild facts · How to remove them</div>
        <div style={STRIP_STYLE}>
          <span>tickpedia.com</span>
        </div>
      </div>
    </Frame>
  )
}
