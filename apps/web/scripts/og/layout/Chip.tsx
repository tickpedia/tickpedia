import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'

// Bordered pill used in the tick template's hero — matches the
// `.tp-chip` look from the live page hero. Tone variant flips the
// border + ink colours.

type Tone = 'neutral' | 'danger-low' | 'danger-mod' | 'danger-high' | 'accent'

interface Props {
  text: string
  tone?: Tone
}

export function Chip({ text, tone = 'neutral' }: Props) {
  const colors = toneColors(tone)
  const style: CSSProperties = {
    fontFamily: 'Geist',
    fontWeight: 600,
    fontSize: 20,
    color: colors.ink,
    backgroundColor: colors.bg,
    border: `2px solid ${colors.border}`,
    borderRadius: 999,
    padding: '6px 18px',
    display: 'flex',
    alignItems: 'center',
  }
  return <div style={style}>{text}</div>
}

function toneColors(tone: Tone): { ink: string; bg: string; border: string } {
  switch (tone) {
    case 'danger-low':
      return { ink: OG_COLORS.dangerLow, bg: OG_COLORS.surface, border: OG_COLORS.dangerLow }
    case 'danger-mod':
      return { ink: OG_COLORS.dangerMod, bg: OG_COLORS.surface, border: OG_COLORS.dangerMod }
    case 'danger-high':
      return { ink: OG_COLORS.dangerHigh, bg: OG_COLORS.surface, border: OG_COLORS.dangerHigh }
    case 'accent':
      return { ink: OG_COLORS.accent, bg: OG_COLORS.surface, border: OG_COLORS.accent }
    case 'neutral':
    default:
      return { ink: OG_COLORS.ink2, bg: OG_COLORS.surface, border: OG_COLORS.rule }
  }
}
