import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'

// Single value-over-label pair (e.g. "1,070 / Counties"). Stat strip
// templates lay three or four of these in a row at the bottom of the
// content area.

interface Props {
  value: string
  label: string
  /** Compact mode shrinks paddings + sizes for 4-up strips. */
  compact?: boolean
}

export function Stat({ value, label, compact }: Props) {
  const valueSize = compact ? 30 : 40
  const labelSize = compact ? 14 : 16
  const valueStyle: CSSProperties = {
    fontFamily: 'Newsreader',
    fontWeight: 500,
    fontSize: valueSize,
    color: OG_COLORS.ink,
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
    display: 'flex',
  }
  const labelStyle: CSSProperties = {
    fontFamily: 'Geist',
    fontWeight: 500,
    fontSize: labelSize,
    color: OG_COLORS.muted,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    marginTop: 4,
    display: 'flex',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={valueStyle}>{value}</span>
      <span style={labelStyle}>{label}</span>
    </div>
  )
}
