import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'
import { Frame } from '../layout/Frame.js'
import { Eyebrow } from '../layout/Eyebrow.js'
import { autoFitFontSize } from './text-clamp.js'

// /og/facts/<slug>.png — pure typography.
// Wild-fact body sized into the canvas: short facts get the biggest
// face, long ones step down. Citation source URL strips along the
// bottom in JetBrains Mono so the data provenance is on the card.

const COLUMN: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  paddingRight: 220,
}

const HEADER_BLOCK: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
}

const BODY_BLOCK: CSSProperties = {
  display: 'flex',
  flex: 1,
  alignItems: 'center',
}

const CITATION_STYLE: CSSProperties = {
  fontFamily: 'JetBrains Mono',
  fontWeight: 500,
  fontSize: 16,
  color: OG_COLORS.muted,
  letterSpacing: '0.02em',
  display: 'flex',
  paddingTop: 18,
  borderTop: `1px solid ${OG_COLORS.rule}`,
  width: '100%',
  marginRight: 240,
}

export interface FactTemplateInput {
  body: string
  citationHost: string | null
}

export function FactTemplate({ body, citationHost }: FactTemplateInput) {
  const fontSize = autoFitFontSize(body, {
    minPx: 28,
    maxPx: 48,
    idealCharsPerLine: 38,
    targetLines: 5,
  })
  const bodyStyle: CSSProperties = {
    fontFamily: 'Newsreader',
    fontWeight: 500,
    fontSize,
    lineHeight: 1.3,
    color: OG_COLORS.ink,
    display: 'flex',
    letterSpacing: '-0.01em',
  }
  return (
    <Frame>
      <div style={COLUMN}>
        <div style={HEADER_BLOCK}>
          <Eyebrow text={'WILD FACT'} />
        </div>
        <div style={BODY_BLOCK}>
          <span style={bodyStyle}>{body}</span>
        </div>
        {citationHost && (
          <div style={CITATION_STYLE}>{`source · ${citationHost}`}</div>
        )}
      </div>
    </Frame>
  )
}
