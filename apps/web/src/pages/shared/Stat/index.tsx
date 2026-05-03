// Hero-sidebar data primitive: a big editorial value, an uppercase
// label, and an optional sub-line. Used in stack form on tick /
// disease pages.

export interface StatProps {
  /** The headline value. Pre-formatted by the caller (e.g. "412", "36–48 h"). */
  value: string
  /** Uppercase label below the value. */
  label: string
  /** Optional secondary line — context for the value. */
  sub?: string
}

export function Stat({ value, label, sub }: StatProps) {
  return (
    <div className="tp-stat">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  )
}
