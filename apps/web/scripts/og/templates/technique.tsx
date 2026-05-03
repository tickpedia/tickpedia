import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'
import { Frame } from '../layout/Frame.js'
import { Eyebrow } from '../layout/Eyebrow.js'

// /og/techniques/<slug>.png — the how-to social card.
// Eyebrow ("REMOVAL · TECHNIQUE"), H1 (technique name), italic
// one-liner, then up to three numbered step cards.

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
  fontSize: 80,
  lineHeight: 1.0,
  letterSpacing: '-0.025em',
  color: OG_COLORS.ink,
  marginTop: 14,
  display: 'flex',
}

const ONELINER_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontStyle: 'italic',
  fontWeight: 500,
  fontSize: 26,
  color: OG_COLORS.muted,
  marginTop: 16,
  display: 'flex',
  maxWidth: 940,
  lineHeight: 1.4,
}

const STEPS_ROW: CSSProperties = {
  display: 'flex',
  marginTop: 32,
  gap: 16,
}

const STEP_CARD: CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
  backgroundColor: OG_COLORS.surface,
  border: `1px solid ${OG_COLORS.rule}`,
  borderRadius: 8,
  padding: '14px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  maxWidth: 320,
}

const STEP_NUM: CSSProperties = {
  fontFamily: 'JetBrains Mono',
  fontWeight: 500,
  fontSize: 16,
  color: OG_COLORS.accent,
  letterSpacing: '0.04em',
  display: 'flex',
}

const STEP_TEXT: CSSProperties = {
  fontFamily: 'Newsreader',
  fontWeight: 500,
  fontSize: 18,
  lineHeight: 1.35,
  color: OG_COLORS.ink2,
  display: 'flex',
}

const CATEGORY_LABEL: Record<string, string> = {
  removal: 'REMOVAL · TECHNIQUE',
  prevention: 'PREVENTION · TECHNIQUE',
  treatment: 'TREATMENT · TECHNIQUE',
  control: 'CONTROL · TECHNIQUE',
}

export interface TechniqueTemplateInput {
  title: string
  oneLiner: string | null
  /** Up to three short step lines, in order. */
  steps: readonly string[]
  /** Optional category — drives the eyebrow text. */
  category?: string | null
}

export function TechniqueTemplate({
  title,
  oneLiner,
  steps,
  category,
}: TechniqueTemplateInput) {
  const eyebrow = category && CATEGORY_LABEL[category.toLowerCase()]
    ? CATEGORY_LABEL[category.toLowerCase()]
    : 'TECHNIQUE'
  const visibleSteps = steps.slice(0, 3)
  return (
    <Frame>
      <div style={COLUMN}>
        <Eyebrow text={eyebrow!} />
        <div style={TITLE_STYLE}>{title}</div>
        {oneLiner && <div style={ONELINER_STYLE}>{oneLiner}</div>}
        {visibleSteps.length > 0 && (
          <div style={STEPS_ROW}>
            {visibleSteps.map((text, i) => (
              <div key={i} style={STEP_CARD}>
                <span style={STEP_NUM}>{`STEP ${i + 1}`}</span>
                <span style={STEP_TEXT}>{text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Frame>
  )
}
