import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'

// All-caps tracking-wide label that sits above every page's H1. The
// "TICK · IXODIDAE" / "DISEASE · CDC-REPORTED" / "STATE · TICK RISK"
// pattern shared across the templates.

interface Props {
  text: string
  color?: string
}

export function Eyebrow({ text, color }: Props) {
  const style: CSSProperties = {
    fontFamily: 'Geist',
    fontWeight: 500,
    fontSize: 22,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: color ?? OG_COLORS.muted,
    display: 'flex',
  }
  return <div style={style}>{text}</div>
}
