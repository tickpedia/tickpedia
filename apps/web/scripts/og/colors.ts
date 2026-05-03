// The paper-theme palette mirrored out of `src/design/tokens.css` so
// the OG generator can hand satori real hex values (CSS variables
// don't reach the satori sandbox). When `tokens.css` shifts, mirror
// the change here — the LICENSES.md file documents the discipline,
// and a follow-up unit test enforces it via a regex pull from the
// CSS source.
//
// Only the paper theme is mirrored: OG cards always render in the
// project's default "paper" voice regardless of what theme the user
// has selected on tickpedia.com.

export const OG_COLORS = {
  bg:           '#f6f1e7',
  bg2:          '#efe8d9',
  surface:      '#fbf7ee',
  ink:          '#1c1814',
  ink2:         '#3b332a',
  muted:        '#6c5f4f',
  muted2:       '#8b7e6b',
  rule:         '#d9cdb6',
  rule2:        '#c8b896',
  accent:       '#8a2a1a',
  accent2:      '#b34a32',
  accentInk:    '#fbf7ee',
  link:         '#6e1e10',
  warn:         '#a04300',
  ok:           '#3f6b3a',
  d0:           '#f6efde',
  d1:           '#ecd9a8',
  d2:           '#d99e62',
  d3:           '#b8552c',
  d4:           '#7a1e0e',
  d5:           '#2a0a04',
  dangerLow:    '#6f7c4a',
  dangerMod:    '#c08a2e',
  dangerHigh:   '#8a2a1a',
} as const

export type OgColor = keyof typeof OG_COLORS

/** OG canvas dimensions — set by Twitter / OG spec, not negotiable. */
export const OG_WIDTH = 1200
export const OG_HEIGHT = 630
