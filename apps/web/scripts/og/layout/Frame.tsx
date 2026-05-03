import type { CSSProperties, ReactNode } from 'react'
import { OG_COLORS, OG_WIDTH, OG_HEIGHT } from '../colors.js'
import { Wordmark } from './Wordmark.js'

// The 1200x630 outer container shared by every template. Establishes
// the paper-theme background, the standard 30px outer padding, and
// drops the Tickpedia wordmark in the bottom-right corner.
//
// Templates compose: <Frame><their layout/></Frame>. They never set
// width/height themselves — the canvas dimensions are owned here.

const ROOT_STYLE: CSSProperties = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  backgroundColor: OG_COLORS.bg,
  padding: 30,
  fontFamily: 'Newsreader',
  color: OG_COLORS.ink,
}

const RULE_STYLE: CSSProperties = {
  position: 'absolute',
  left: 30,
  right: 30,
  top: 30,
  height: 1,
  backgroundColor: OG_COLORS.rule,
  display: 'flex',
}

const WORDMARK_SLOT: CSSProperties = {
  position: 'absolute',
  right: 30,
  bottom: 30,
  display: 'flex',
}

interface Props {
  children: ReactNode
  /** Override the canvas background (e.g. risk map renders dark). */
  background?: string
  /** Hide the bottom-right wordmark — risk-map full-bleed templates. */
  hideWordmark?: boolean
}

export function Frame({ children, background, hideWordmark }: Props) {
  const style: CSSProperties = background ? { ...ROOT_STYLE, backgroundColor: background } : ROOT_STYLE
  return (
    <div style={style}>
      <div style={RULE_STYLE} />
      {children}
      {!hideWordmark && (
        <div style={WORDMARK_SLOT}>
          <Wordmark size={28} />
        </div>
      )}
    </div>
  )
}
