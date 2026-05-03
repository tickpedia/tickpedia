import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'
import { Frame } from '../layout/Frame.js'
import { Eyebrow } from '../layout/Eyebrow.js'
import { Chip } from '../layout/Chip.js'
import { clamp2Lines } from './text-clamp.js'

// /og/ticks/<slug>.png — the field-guide entry's social card.
// Mirrors the live page hero: eyebrow ("TICK · IXODIDAE"), H1
// (common name), italic scientific name, one-liner truncated to two
// lines, then chip rail.
//
// The live hero pairs a tick crest (TickCrest from @tickpedia/ui) on
// the left. satori can't render that asset's ring text reliably, so
// the OG version skips the crest and lets the typography breathe —
// readers scan the social card for ~1 second; the image is chaff.

const ROW: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  paddingRight: 220, // leave room for the bottom-right wordmark
}

const TITLE_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontWeight: 500,
  fontSize: 92,
  lineHeight: 1.0,
  letterSpacing: '-0.025em',
  color: OG_COLORS.ink,
  marginTop: 18,
  display: 'flex',
}

const SCI_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontStyle: 'italic',
  fontWeight: 500,
  fontSize: 36,
  color: OG_COLORS.muted,
  marginTop: 8,
  display: 'flex',
}

const ONELINER_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontWeight: 500,
  fontSize: 28,
  lineHeight: 1.4,
  color: OG_COLORS.ink2,
  marginTop: 24,
  display: 'flex',
  maxWidth: 940,
}

const CHIP_ROW: CSSProperties = {
  display: 'flex',
  gap: 12,
  marginTop: 28,
}

export type TickDanger = 'high' | 'mod' | 'low' | null

export interface TickTemplateInput {
  commonName: string
  scientificName: string
  oneLiner: string | null
  family: string | null
  diseaseCount: number
  danger: TickDanger
}

export function TickTemplate({
  commonName,
  scientificName,
  oneLiner,
  family,
  diseaseCount,
  danger,
}: TickTemplateInput) {
  const eyebrow = family
    ? `TICK · ${family.toUpperCase()}`
    : 'TICK · FIELD GUIDE'
  return (
    <Frame>
      <div style={ROW}>
        <Eyebrow text={eyebrow} />
        <div style={TITLE_STYLE}>{commonName}</div>
        <div style={SCI_STYLE}>{scientificName}</div>
        {oneLiner && (
          <div style={ONELINER_STYLE}>{clamp2Lines(oneLiner, 140)}</div>
        )}
        <div style={CHIP_ROW}>
          {danger && <Chip text={dangerLabel(danger)} tone={`danger-${danger}`} />}
          {diseaseCount > 0 && <Chip text={`${diseaseCount} diseases`} />}
        </div>
      </div>
    </Frame>
  )
}

export interface TickRangeTemplateInput {
  commonName: string
  scientificName: string
  countyCount: number
  stateCount: number
}

export function TickRangeTemplate({
  commonName,
  scientificName,
  countyCount,
  stateCount,
}: TickRangeTemplateInput) {
  const summary =
    countyCount > 0 || stateCount > 0
      ? `Established · ${countyCount.toLocaleString()} counties · ${stateCount} states`
      : 'Reported range across the United States'
  return (
    <Frame>
      <div style={ROW}>
        <Eyebrow text={'TICK · RANGE'} />
        <div style={TITLE_STYLE}>{`${commonName} range`}</div>
        <div style={SCI_STYLE}>{scientificName}</div>
        <div style={{ ...ONELINER_STYLE, marginTop: 28 }}>{summary}</div>
      </div>
    </Frame>
  )
}

function dangerLabel(level: 'high' | 'mod' | 'low'): string {
  switch (level) {
    case 'high': return 'High danger'
    case 'mod':  return 'Moderate danger'
    case 'low':  return 'Low danger'
  }
}
