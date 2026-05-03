import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'
import { Frame } from '../layout/Frame.js'
import { Eyebrow } from '../layout/Eyebrow.js'
import { Stat } from '../layout/Stat.js'

// /og/states/<slug>.png. Big serif state name, USPS code badge, three
// stats. The live page wants a "spotlight on a state with neighbours
// visible" cartogram — pre-rasterising the choropleth grid is a
// follow-up; v1 goes typography-first.

const COLUMN: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  paddingRight: 220,
}

const TITLE_ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 22,
  marginTop: 12,
}

const TITLE_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontWeight: 500,
  fontSize: 116,
  lineHeight: 1.0,
  letterSpacing: '-0.028em',
  color: OG_COLORS.ink,
  display: 'flex',
}

const CODE_BADGE: CSSProperties = {
  fontFamily: 'Geist',
  fontWeight: 600,
  fontSize: 26,
  letterSpacing: '0.18em',
  color: OG_COLORS.accentInk,
  backgroundColor: OG_COLORS.accent,
  padding: '8px 16px',
  borderRadius: 6,
  marginBottom: 22,
  display: 'flex',
}

const STAT_STRIP: CSSProperties = {
  display: 'flex',
  gap: 64,
  marginTop: 36,
}

const TAGLINE_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontStyle: 'italic',
  fontWeight: 500,
  fontSize: 28,
  color: OG_COLORS.muted,
  marginTop: 14,
  display: 'flex',
}

export interface StateTemplateInput {
  name: string
  code: string
  tickCount: number
  countyEstablished: number
  diseaseCount: number
}

export function StateTemplate({
  name,
  code,
  tickCount,
  countyEstablished,
  diseaseCount,
}: StateTemplateInput) {
  return (
    <Frame>
      <div style={COLUMN}>
        <Eyebrow text={'STATE · TICK RISK'} />
        <div style={TITLE_ROW}>
          <span style={TITLE_STYLE}>{name}</span>
          {code && <div style={CODE_BADGE}>{code.toUpperCase()}</div>}
        </div>
        <div style={TAGLINE_STYLE}>Tick species, disease cases, and county-level breakdowns.</div>
        <div style={STAT_STRIP}>
          <Stat value={tickCount.toLocaleString()} label="Tick species" />
          <Stat value={countyEstablished.toLocaleString()} label="Counties est." />
          <Stat value={diseaseCount.toLocaleString()} label="Diseases" />
        </div>
      </div>
    </Frame>
  )
}
