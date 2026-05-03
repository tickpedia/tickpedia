import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'
import { Frame } from '../layout/Frame.js'

// /og/home.png — the social card for tickpedia.com itself.
// Centered wordmark + tagline + a strip of headline counts. This is
// the "vanilla but still a nice SEO page" default that everything
// else is judged against.

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
  fontSize: 112,
  letterSpacing: '-0.028em',
  color: OG_COLORS.ink,
  display: 'flex',
  lineHeight: 1,
}

const TAGLINE_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontStyle: 'italic',
  fontWeight: 500,
  fontSize: 30,
  color: OG_COLORS.muted,
  marginTop: 22,
  display: 'flex',
}

const STAT_STRIP: CSSProperties = {
  display: 'flex',
  marginTop: 56,
  gap: 32,
  fontFamily: 'Geist',
  fontWeight: 600,
  fontSize: 22,
  color: OG_COLORS.ink2,
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

export interface HomeTemplateInput {
  tickCount: number
  diseaseCount: number
  stateCount: number
}

export function HomeTemplate({ tickCount, diseaseCount, stateCount }: HomeTemplateInput) {
  return (
    <Frame hideWordmark>
      <div style={HERO_WRAP}>
        <div style={WORDMARK_STYLE}>Tickpedia</div>
        <div style={TAGLINE_STYLE}>Ticks by region · Wild facts · How to remove them</div>
        <div style={STAT_STRIP}>
          <span>{`${tickCount} species`}</span>
          <div style={STAT_DOT} />
          <span>{`${diseaseCount} diseases`}</span>
          <div style={STAT_DOT} />
          <span>{`${stateCount} states`}</span>
        </div>
      </div>
    </Frame>
  )
}
