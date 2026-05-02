// Square-tile cartogram of the 50 states + DC. Coordinates are the
// design's manual layout — chosen so the cluster reads geographically
// without TopoJSON or projection math. Width 11 cells × 7 rows; AK/HI
// pinned to the lower-left, FL hanging off the SE.
//
// `gx` and `gy` are *cell* offsets (not px). Fractional values let the
// New England cluster squeeze in without overlapping NY/PA. The
// renderer multiplies by a chosen cell size.

export interface StateTile {
  code: string
  gx: number
  gy: number
}

export const STATE_GRID: readonly StateTile[] = [
  { code: 'AK', gx: 0, gy: 0 }, { code: 'ME', gx: 10, gy: 0 },
  { code: 'VT', gx: 9, gy: 1 }, { code: 'NH', gx: 10, gy: 1 },
  { code: 'WA', gx: 1, gy: 1 }, { code: 'ID', gx: 2, gy: 1 }, { code: 'MT', gx: 3, gy: 1 }, { code: 'ND', gx: 4, gy: 1 },
  { code: 'MN', gx: 5, gy: 1 }, { code: 'WI', gx: 6, gy: 1 }, { code: 'MI', gx: 7, gy: 1 },
  { code: 'NY', gx: 8, gy: 2 }, { code: 'MA', gx: 10, gy: 2 },
  { code: 'OR', gx: 1, gy: 2 }, { code: 'UT', gx: 2, gy: 2 }, { code: 'WY', gx: 3, gy: 2 }, { code: 'SD', gx: 4, gy: 2 },
  { code: 'IA', gx: 5, gy: 2 }, { code: 'IL', gx: 6, gy: 2 }, { code: 'IN', gx: 7, gy: 2 },
  { code: 'OH', gx: 8, gy: 3 }, { code: 'PA', gx: 9, gy: 2 }, { code: 'NJ', gx: 10, gy: 3 },
  { code: 'CT', gx: 10, gy: 2.4 }, { code: 'RI', gx: 10, gy: 2.7 },
  { code: 'CA', gx: 1, gy: 3 }, { code: 'NV', gx: 2, gy: 3 }, { code: 'CO', gx: 3, gy: 3 }, { code: 'NE', gx: 4, gy: 3 },
  { code: 'MO', gx: 5, gy: 3 }, { code: 'KY', gx: 6, gy: 3 }, { code: 'WV', gx: 7, gy: 3 },
  { code: 'VA', gx: 8, gy: 4 }, { code: 'MD', gx: 9, gy: 3 }, { code: 'DE', gx: 10, gy: 3.4 },
  { code: 'AZ', gx: 2, gy: 4 }, { code: 'NM', gx: 3, gy: 4 }, { code: 'KS', gx: 4, gy: 4 }, { code: 'AR', gx: 5, gy: 4 },
  { code: 'TN', gx: 6, gy: 4 }, { code: 'NC', gx: 7, gy: 4 }, { code: 'SC', gx: 8, gy: 5 },
  { code: 'HI', gx: 0, gy: 5 }, { code: 'TX', gx: 4, gy: 5 }, { code: 'OK', gx: 4, gy: 4.5 },
  { code: 'LA', gx: 5, gy: 5 }, { code: 'MS', gx: 6, gy: 5 }, { code: 'AL', gx: 6, gy: 5.5 },
  { code: 'GA', gx: 7, gy: 5 }, { code: 'FL', gx: 8, gy: 6 },
  { code: 'DC', gx: 9, gy: 3.7 },
] as const

export const GRID_COLS = 11
export const GRID_ROWS = 7
