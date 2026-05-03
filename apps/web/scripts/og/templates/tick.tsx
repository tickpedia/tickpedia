import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'
import { Frame } from '../layout/Frame.js'
import { Eyebrow } from '../layout/Eyebrow.js'
import { Chip } from '../layout/Chip.js'
import { TickCrestImg } from '../layout/TickCrestImg.js'
import { clamp2Lines } from './text-clamp.js'

// /og/ticks/<slug>.png — the field-guide entry's social card.
// Mirrors the live page hero: tick crest (PNG-data-url, pre-
// rasterised from the @tickpedia/ui tick SVG with the per-tick hero
// colours) on the left, and the editorial column on the right
// (eyebrow, H1, italic scientific name, one-liner, chip rail).
//
// The original step 08 spec (§C1) called for ring text on the crest;
// satori doesn't path-attach text reliably, so the OG version drops
// the ring text in favour of the silhouette. The bare illustration
// reads instantly at OG resolution; ring text would not.

const TWO_COL: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 36,
  paddingRight: 220, // leave room for the bottom-right wordmark
}

const TEXT_COL: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
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

export interface TickHeroColors {
  headColor: string | null
  bodyColor: string | null
  legColor: string | null
}

export interface TickTemplateInput {
  commonName: string
  scientificName: string
  oneLiner: string | null
  family: string | null
  diseaseCount: number
  danger: TickDanger
  colors: TickHeroColors
}

export function TickTemplate({
  commonName,
  scientificName,
  oneLiner,
  family,
  diseaseCount,
  danger,
  colors,
}: TickTemplateInput) {
  const eyebrow = family
    ? `TICK · ${family.toUpperCase()}`
    : 'TICK · FIELD GUIDE'
  return (
    <Frame>
      <div style={TWO_COL}>
        <TickCrestImg colors={colors} />
        <div style={TEXT_COL}>
          <Eyebrow text={eyebrow} />
          <div style={TITLE_STYLE}>{commonName}</div>
          <div style={SCI_STYLE}>{scientificName}</div>
          {oneLiner && (
            <div style={ONELINER_STYLE}>{clamp2Lines(oneLiner, 110)}</div>
          )}
          <div style={CHIP_ROW}>
            {danger && <Chip text={dangerLabel(danger)} tone={`danger-${danger}`} />}
            {diseaseCount > 0 && <Chip text={`${diseaseCount} diseases`} />}
          </div>
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
  colors: TickHeroColors
}

export function TickRangeTemplate({
  commonName,
  scientificName,
  countyCount,
  stateCount,
  colors,
}: TickRangeTemplateInput) {
  const summary =
    countyCount > 0 || stateCount > 0
      ? `Established · ${countyCount.toLocaleString()} counties · ${stateCount} states`
      : 'Reported range across the United States'
  return (
    <Frame>
      <div style={TWO_COL}>
        <TickCrestImg colors={colors} />
        <div style={TEXT_COL}>
          <Eyebrow text={'TICK · RANGE'} />
          <div style={TITLE_STYLE}>{`${commonName} range`}</div>
          <div style={SCI_STYLE}>{scientificName}</div>
          <div style={{ ...ONELINER_STYLE, marginTop: 28 }}>{summary}</div>
        </div>
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
