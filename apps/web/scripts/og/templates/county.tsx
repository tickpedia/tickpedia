import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'
import { Frame } from '../layout/Frame.js'
import { Eyebrow } from '../layout/Eyebrow.js'
import { Stat } from '../layout/Stat.js'

// /og/counties/<state>/<slug>.png. The live page hooks the user with
// a "you are here" lat/lng pin on a US outline. v1 of the OG template
// drops the map and leans on the parent state + county name pair —
// counties have lots of names and the map's marginal value at OG
// resolution is small. The follow-up adds the inline US-outline once
// the SVG is portable enough to embed via satori.

const COLUMN: CSSProperties = {
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
  fontSize: 78,
  lineHeight: 1.0,
  letterSpacing: '-0.025em',
  color: OG_COLORS.ink,
  marginTop: 12,
  display: 'flex',
}

const PARENT_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontStyle: 'italic',
  fontWeight: 500,
  fontSize: 28,
  color: OG_COLORS.muted,
  marginTop: 16,
  display: 'flex',
}

const STAT_STRIP: CSSProperties = {
  display: 'flex',
  gap: 56,
  marginTop: 36,
}

export interface CountyTemplateInput {
  countyName: string
  parentStateName: string
  tickCount: number
  diseaseCases: number
  population: number | null
}

export function CountyTemplate({
  countyName,
  parentStateName,
  tickCount,
  diseaseCases,
  population,
}: CountyTemplateInput) {
  return (
    <Frame>
      <div style={COLUMN}>
        <Eyebrow text={`${parentStateName.toUpperCase()} · COUNTY`} />
        <div style={TITLE_STYLE}>{countyName}</div>
        <div style={PARENT_STYLE}>{`In ${parentStateName} — tick species, cases, and the closest counties.`}</div>
        <div style={STAT_STRIP}>
          <Stat value={tickCount.toLocaleString()} label="Tick species" />
          <Stat value={diseaseCases.toLocaleString()} label="Cases / yr" />
          {population !== null && (
            <Stat value={formatPopulation(population)} label="Population" />
          )}
        </div>
      </div>
    </Frame>
  )
}

function formatPopulation(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return n.toLocaleString()
}
