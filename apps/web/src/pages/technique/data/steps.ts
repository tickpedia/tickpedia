// Pure step parser — no React, no `beam` import. Lives in its own
// module so the prerender script (Node + tsx) can pull it without
// dragging the runtime SemiLayer client.
//
// `removalTechniques.steps` is a single text blob with newline-
// delimited entries, optionally prefixed by `1.`, `2.`, or `-`.
// Editorial style isn't strict — handle both.

export interface ParsedStep {
  /** 1-based ordinal — matches schema.org/HowTo's `position`. */
  position: number
  /** Step body, prefix-stripped, single-line. */
  text: string
}

export function parseSteps(raw: string | null | undefined): ParsedStep[] {
  if (!raw) return []
  const lines = raw
    .split(/\r?\n/)
    .map((line) => stripLeadingPrefix(line.trim()))
    .filter((line) => line.length > 0)
  return lines.map((text, i) => ({ position: i + 1, text }))
}

function stripLeadingPrefix(line: string): string {
  // Numbered: "1.", "12)", "1:" — common variants.
  const numbered = /^\d{1,3}[\.\):]\s+/.exec(line)
  if (numbered) return line.slice(numbered[0].length)
  // Bulleted: "- foo", "• foo", "* foo".
  const bullet = /^[-•*]\s+/.exec(line)
  if (bullet) return line.slice(bullet[0].length)
  return line
}
