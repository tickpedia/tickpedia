import { parseSteps } from '../data/steps.js'

// Numbered HowTo steps. Each row is a two-column grid: the ordinal
// (01, 02, …) on the left in the accent serif, the body on the right.
// Mirrors the design's HowTo layout in art-tech-state-county.jsx.

export interface StepsSectionProps {
  steps: string | null
  techniqueTitle: string
  anchorId?: string
}

export function StepsSection({
  steps,
  techniqueTitle,
  anchorId = 'steps',
}: StepsSectionProps) {
  const parsed = parseSteps(steps)

  return (
    <section
      id={anchorId}
      className="tp-section"
      data-testid="technique-steps"
    >
      <div className="head">
        <h2 className="tp-serif">Steps</h2>
        <span className="meta">schema.org/HowTo</span>
      </div>

      {parsed.length === 0 && (
        <p className="tp-serif" style={{ fontSize: 14, color: 'var(--muted)' }}>
          {steps && steps.trim().length > 0
            ? steps
            : `No step-by-step guidance recorded for ${techniqueTitle} yet.`}
        </p>
      )}

      {parsed.length > 0 && (
        <ol
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 16 }}
        >
          {parsed.map((step) => (
            <li
              key={step.position}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px minmax(0, 1fr)',
                gap: 16,
                paddingBottom: 14,
                borderBottom: '1px solid var(--rule)',
              }}
            >
              <div
                className="tp-serif"
                style={{ fontSize: 28, color: 'var(--accent)', lineHeight: 1 }}
              >
                {String(step.position).padStart(2, '0')}
              </div>
              <div
                className="tp-serif"
                style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.5 }}
              >
                {step.text}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
