// Square-tile cartogram of the 50 states + DC. Coordinates are the
// design's manual layout — chosen so the cluster reads geographically
// without TopoJSON or projection math. 12 cells wide × 8 rows tall;
// AK/HI pinned to the left column, FL hanging off the SE.
//
// `gx` and `gy` are *integer* cell offsets. Every state gets its own
// cell — no fractions, no overlaps. The renderer multiplies by a
// chosen cell size.

export interface StateTile {
  code: string
  gx: number
  gy: number
}

export const STATE_GRID: readonly StateTile[] = [
  // Row 0 — AK pinned far left, ME at the NE corner.
  { code: 'AK', gx: 0,  gy: 0 }, { code: 'ME', gx: 11, gy: 0 },

  // Row 1 — northern New England.
  { code: 'VT', gx: 10, gy: 1 }, { code: 'NH', gx: 11, gy: 1 },

  // Row 2 — northern tier across the Great Lakes.
  { code: 'WA', gx: 1, gy: 2 }, { code: 'ID', gx: 2, gy: 2 }, { code: 'MT', gx: 3, gy: 2 },
  { code: 'ND', gx: 4, gy: 2 }, { code: 'MN', gx: 5, gy: 2 }, { code: 'WI', gx: 6, gy: 2 },
  { code: 'MI', gx: 8, gy: 2 }, { code: 'NY', gx: 9, gy: 2 }, { code: 'MA', gx: 10, gy: 2 },

  // Row 3 — middle band, Pacific to Atlantic.
  { code: 'OR', gx: 1, gy: 3 }, { code: 'NV', gx: 2, gy: 3 }, { code: 'WY', gx: 3, gy: 3 },
  { code: 'SD', gx: 4, gy: 3 }, { code: 'IA', gx: 5, gy: 3 }, { code: 'IL', gx: 6, gy: 3 },
  { code: 'IN', gx: 7, gy: 3 }, { code: 'OH', gx: 8, gy: 3 }, { code: 'PA', gx: 9, gy: 3 },
  { code: 'NJ', gx: 10, gy: 3 }, { code: 'CT', gx: 11, gy: 3 },

  // Row 4 — lower-middle band; RI tucks under CT.
  { code: 'CA', gx: 1, gy: 4 }, { code: 'UT', gx: 2, gy: 4 }, { code: 'CO', gx: 3, gy: 4 },
  { code: 'NE', gx: 4, gy: 4 }, { code: 'MO', gx: 5, gy: 4 }, { code: 'KY', gx: 6, gy: 4 },
  { code: 'WV', gx: 7, gy: 4 }, { code: 'VA', gx: 8, gy: 4 }, { code: 'MD', gx: 9, gy: 4 },
  { code: 'DE', gx: 10, gy: 4 }, { code: 'RI', gx: 11, gy: 4 },

  // Row 5 — southern band; DC sits between MD/VA column and the SE.
  { code: 'AZ', gx: 2, gy: 5 }, { code: 'NM', gx: 3, gy: 5 }, { code: 'KS', gx: 4, gy: 5 },
  { code: 'AR', gx: 5, gy: 5 }, { code: 'TN', gx: 6, gy: 5 }, { code: 'NC', gx: 7, gy: 5 },
  { code: 'SC', gx: 8, gy: 5 }, { code: 'DC', gx: 9, gy: 5 },

  // Row 6 — Gulf coast; HI pinned far left under AK.
  { code: 'HI', gx: 0, gy: 6 },
  { code: 'OK', gx: 4, gy: 6 }, { code: 'LA', gx: 5, gy: 6 }, { code: 'MS', gx: 6, gy: 6 },
  { code: 'AL', gx: 7, gy: 6 }, { code: 'GA', gx: 8, gy: 6 },

  // Row 7 — TX hangs south of OK; FL drops off the SE.
  { code: 'TX', gx: 4, gy: 7 }, { code: 'FL', gx: 8, gy: 7 },
] as const

export const GRID_COLS = 12
export const GRID_ROWS = 8
