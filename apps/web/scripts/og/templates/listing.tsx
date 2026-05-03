import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'
import { Frame } from '../layout/Frame.js'
import { Eyebrow } from '../layout/Eyebrow.js'

// Generic listing card — used for /ticks, /diseases, /states,
// /counties, /techniques, /facts indexes plus the meta pages
// (/about, /sources, /season). Eyebrow + headline + description.
// One file, one component — instead of nine near-identical templates.

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
  fontSize: 96,
  lineHeight: 1.0,
  letterSpacing: '-0.025em',
  color: OG_COLORS.ink,
  marginTop: 14,
  display: 'flex',
}

const DESCR_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontStyle: 'italic',
  fontWeight: 500,
  fontSize: 30,
  color: OG_COLORS.muted,
  marginTop: 18,
  display: 'flex',
  maxWidth: 940,
  lineHeight: 1.4,
}

export interface ListingTemplateInput {
  eyebrow: string
  title: string
  description: string
}

export function ListingTemplate({ eyebrow, title, description }: ListingTemplateInput) {
  return (
    <Frame>
      <div style={COLUMN}>
        <Eyebrow text={eyebrow} />
        <div style={TITLE_STYLE}>{title}</div>
        <div style={DESCR_STYLE}>{description}</div>
      </div>
    </Frame>
  )
}
