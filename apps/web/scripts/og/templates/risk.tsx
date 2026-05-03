import type { CSSProperties } from 'react'
import { OG_COLORS } from '../colors.js'
import { Frame } from '../layout/Frame.js'

// /og/risk.png and /og/risk/<slug>.png. The live page leans on the H3
// hexagon heatmap; pre-rasterising that into satori is a richer
// follow-up (resvg can ingest the SVG once the chart's pure helpers
// can render to a string from Node). For v1 the OG card uses the
// dark accent palette so it stands out in feeds, with the risk-map
// label and an optional disease filter callout.

const COLUMN: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
}

const EYEBROW_STYLE: CSSProperties = {
  fontFamily: 'Geist',
  fontWeight: 600,
  fontSize: 22,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: OG_COLORS.muted2,
  display: 'flex',
}

const TITLE_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontWeight: 500,
  fontSize: 100,
  letterSpacing: '-0.025em',
  color: OG_COLORS.accentInk,
  marginTop: 14,
  display: 'flex',
  lineHeight: 1.0,
}

const DESCR_STYLE: CSSProperties = {
  fontFamily: 'Newsreader',
  fontStyle: 'italic',
  fontWeight: 500,
  fontSize: 30,
  color: OG_COLORS.surface,
  marginTop: 16,
  display: 'flex',
  maxWidth: 940,
}

// Faux H3 grid backdrop — rows of opacity-staggered dots that hint at
// the heatmap without paying the cost of pre-rasterising it. 9 rows ×
// 18 cols ≈ 162 cells, light enough that satori handles it.
const GRID_WRAP: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  paddingTop: 60,
  gap: 12,
  pointerEvents: 'none' as unknown as undefined,
}
const ROW: CSSProperties = {
  display: 'flex',
  gap: 12,
  paddingLeft: 60,
}

interface Cell {
  size: number
  opacity: number
}

function gridCells(seed: number): Cell[][] {
  const rows: Cell[][] = []
  let s = seed
  const next = () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32
    return s / 2 ** 32
  }
  for (let r = 0; r < 9; r++) {
    const row: Cell[] = []
    for (let c = 0; c < 18; c++) {
      const r2 = next()
      const size = 24
      const opacity = r2 < 0.4 ? 0.06 : r2 < 0.75 ? 0.22 : 0.55
      row.push({ size, opacity })
    }
    rows.push(row)
  }
  return rows
}

export interface RiskTemplateInput {
  /** Optional disease slug → switches subtitle + seed for the grid. */
  diseaseLabel: string | null
}

export function RiskTemplate({ diseaseLabel }: RiskTemplateInput) {
  const eyebrow = diseaseLabel ? `RISK MAP · ${diseaseLabel.toUpperCase()}` : 'RISK MAP'
  const title = diseaseLabel ? diseaseLabel : 'Continental tick risk'
  const descr = diseaseLabel
    ? `Where ${diseaseLabel} cases concentrate — H3 r4 hex density across the lower 48.`
    : 'H3 r4 hex density of CDC-reported tick-borne cases across the lower 48.'
  const grid = gridCells(diseaseLabel ? hash(diseaseLabel) : 0xDEAD)

  return (
    <Frame background={'#1a1410'}>
      <div style={GRID_WRAP}>
        {grid.map((row, ri) => (
          <div key={ri} style={ROW}>
            {row.map((cell, ci) => (
              <div
                key={ci}
                style={{
                  width: cell.size,
                  height: cell.size,
                  borderRadius: cell.size,
                  backgroundColor: OG_COLORS.accent2,
                  opacity: cell.opacity,
                  display: 'flex',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={COLUMN}>
        <span style={EYEBROW_STYLE}>{eyebrow}</span>
        <span style={TITLE_STYLE}>{title}</span>
        <span style={DESCR_STYLE}>{descr}</span>
      </div>
    </Frame>
  )
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return h >>> 0
}
