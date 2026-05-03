import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'
import { Frame } from '../layout/Frame.js'
import { Eyebrow } from '../layout/Eyebrow.js'
import { clamp2Lines } from './text-clamp.js'

// /og/diseases/<slug>.png — the disease's social card.
// Hero: eyebrow + display name + alias italic + one-liner. Stat strip
// at the bottom carries reported-cases + peak month.
//
// The live disease page leans on a radial seasonality chart for the
// hero. Pre-rasterising that into a satori <img> is meaningful work
// (resvg can ingest the chart's SVG, but the chart's `RadialSeasonality`
// component renders inside React + browser-DOM today). For v1 the OG
// goes text-first; the radial is a follow-up once the chart's pure
// helpers can render to a string from Node.

const ROW: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  paddingRight: 220,
}

const TITLE_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontWeight: 500,
  fontSize: 88,
  lineHeight: 1.0,
  letterSpacing: '-0.025em',
  color: OG_COLORS.ink,
  marginTop: 18,
  display: 'flex',
}

const ALIAS_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontStyle: 'italic',
  fontWeight: 500,
  fontSize: 32,
  color: OG_COLORS.muted,
  marginTop: 6,
  display: 'flex',
}

const ONELINER_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontWeight: 500,
  fontSize: 26,
  lineHeight: 1.4,
  color: OG_COLORS.ink2,
  marginTop: 22,
  display: 'flex',
  maxWidth: 940,
}

const STAT_STRIP: CSSProperties = {
  display: 'flex',
  marginTop: 32,
  gap: 28,
  fontFamily: 'Geist',
  fontWeight: 600,
  fontSize: 22,
  color: OG_COLORS.accent,
  letterSpacing: '0.04em',
}

const STAT_DOT: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: 6,
  backgroundColor: OG_COLORS.muted2,
  alignSelf: 'center',
  display: 'flex',
}

export interface DiseaseTemplateInput {
  displayName: string
  oneLiner: string | null
  primaryAlias: string | null
  totalCases: number | null
  peakMonth: string | null
}

export function DiseaseTemplate({
  displayName,
  oneLiner,
  primaryAlias,
  totalCases,
  peakMonth,
}: DiseaseTemplateInput) {
  const stripParts: string[] = []
  if (totalCases && totalCases > 0) {
    stripParts.push(`${totalCases.toLocaleString()} reported cases`)
  }
  if (peakMonth) {
    stripParts.push(`Peak · ${peakMonth}`)
  }

  return (
    <Frame>
      <div style={ROW}>
        <Eyebrow text={'DISEASE · TICK-BORNE ILLNESS'} />
        <div style={TITLE_STYLE}>{displayName}</div>
        {primaryAlias && <div style={ALIAS_STYLE}>{primaryAlias}</div>}
        {oneLiner && (
          <div style={ONELINER_STYLE}>{clamp2Lines(oneLiner, 150)}</div>
        )}
        {stripParts.length > 0 && (
          <div style={STAT_STRIP}>
            {stripParts.map((part, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {i > 0 && <span style={STAT_DOT} />}
                <span>{part}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </Frame>
  )
}
