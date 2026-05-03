import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OG_COLORS } from '../colors.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const TOKENS_PATH = resolve(HERE, '..', '..', '..', 'src', 'design', 'tokens.css')

// Brand-drift watch (step 08 follow-up #2). Asserts the OG generator's
// mirrored palette matches the live `--var: #...` declarations in the
// paper-theme block of `tokens.css`. If the design palette shifts and
// the OG mirror doesn't, social-share previews drift; this test
// surfaces that loudly.

describe('OG palette mirrors paper theme tokens.css', () => {
  const css = readFileSync(TOKENS_PATH, 'utf8')
  const paperBlock = extractPaperBlock(css)

  it.each([
    ['--bg',           OG_COLORS.bg],
    ['--bg-2',         OG_COLORS.bg2],
    ['--surface',      OG_COLORS.surface],
    ['--ink',          OG_COLORS.ink],
    ['--ink-2',        OG_COLORS.ink2],
    ['--muted',        OG_COLORS.muted],
    ['--muted-2',      OG_COLORS.muted2],
    ['--rule',         OG_COLORS.rule],
    ['--rule-2',       OG_COLORS.rule2],
    ['--accent',       OG_COLORS.accent],
    ['--accent-2',     OG_COLORS.accent2],
    ['--accent-ink',   OG_COLORS.accentInk],
    ['--link',         OG_COLORS.link],
    ['--danger-low',   OG_COLORS.dangerLow],
    ['--danger-mod',   OG_COLORS.dangerMod],
    ['--danger-high',  OG_COLORS.dangerHigh],
  ])('%s mirrors %s', (cssVar, mirroredValue) => {
    const cssValue = readVar(paperBlock, cssVar)
    expect(cssValue?.toLowerCase()).toBe(mirroredValue.toLowerCase())
  })
})

function extractPaperBlock(css: string): string {
  // The paper theme is the top block (`:root, [data-theme='paper']`).
  // Match between the first `{` and its matching `}`.
  const idx = css.indexOf("[data-theme='paper']")
  if (idx < 0) throw new Error('paper theme block not found in tokens.css')
  const open = css.indexOf('{', idx)
  const close = css.indexOf('}', open)
  return css.slice(open, close + 1)
}

function readVar(block: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*:\\s*([^;]+);`)
  const m = re.exec(block)
  return m && m[1] ? m[1].trim() : null
}
