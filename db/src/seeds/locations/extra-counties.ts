// Counties created or renamed after the FCC fips.txt snapshot we ship
// (the FCC file is pre-2001 and missing post-2000 boundary changes).
//
// Modern federal datasets — including CDC's per-county tick / TBD
// surveillance files — use the new FIPS, so importing them against our
// seed alone produces "Unknown county FIPS" errors. This list patches
// in the deltas so those imports succeed without overwriting historical
// rows that still reference the old FIPS.
//
// When you add to this list, keep it minimal: only counties we've
// actually seen in source data, and prefer leaving the old FIPS in
// place (so historical rows don't FK-fail) rather than renaming.

import type { SeedCounty } from './index.js'

export const EXTRA_COUNTIES: readonly SeedCounty[] = [
  // CO — Broomfield split off from Adams/Boulder/Jefferson/Weld in 2001.
  { fips: '08014', stateFips: '08', countyName: 'Broomfield County', slug: 'broomfield' },

  // FL — "Dade County" was renamed "Miami-Dade County" in 1997 and got
  // a new FIPS (12086). The legacy 12025 entry stays in the seed for
  // historical compatibility.
  { fips: '12086', stateFips: '12', countyName: 'Miami-Dade County', slug: 'miami-dade' },
] as const
