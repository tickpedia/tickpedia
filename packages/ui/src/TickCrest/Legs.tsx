// Eight straight legs radiating from the body. Geometry mirrors
// `tickSvg` / `tickCrestSvg` in tick-art.ts so the React TickCrest,
// the inline admin-preview TickArt, and the OG image generator render
// the same leg paths.

export interface LegsProps {
  color: string
}

const LEG_PATHS: ReadonlyArray<string> = [
  'M36 50 L28 46',
  'M34 60 L24 60',
  'M34 70 L26 76',
  'M38 80 L32 88',
  'M64 50 L72 46',
  'M66 60 L76 60',
  'M66 70 L74 76',
  'M62 80 L68 88',
]

export function Legs({ color }: LegsProps) {
  return (
    <g stroke={color} strokeWidth="3" strokeLinecap="round" fill="none">
      {LEG_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  )
}
