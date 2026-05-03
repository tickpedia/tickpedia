// Serialize the SSR data cache into an HTML-safe `<script>` payload.
//
// The shape of cache entries is JSON-serializable by construction
// (`Record<string, unknown>` of plain objects / arrays / primitives),
// so this is JSON.stringify with two safety wrappers:
//   1. Escape `</` so a stray `</script>` in user-content can't close
//      the inline tag.
//   2. Escape U+2028 / U+2029 — valid in JSON strings but not in JS
//      source, so a payload using them would parse as JSON yet be a
//      syntax error when the browser interprets the inline `<script>`.

import type { DataCache } from './SSRDataProvider.js'

export function serializeDataCache(cache: DataCache): string {
  const json = JSON.stringify(cache)
  return escapeForScript(json)
}

// Use the RegExp constructor with explicit `\u` escapes so the source
// stays plain ASCII — embedding the literal chars in a regex literal
// trips esbuild ("Unterminated regular expression").
const LT = /</g
const LINE_SEP = new RegExp('\\u2028', 'g')
const PARA_SEP = new RegExp('\\u2029', 'g')

export function escapeForScript(json: string): string {
  return json
    .replace(LT, '\\u003c')
    .replace(LINE_SEP, '\\u2028')
    .replace(PARA_SEP, '\\u2029')
}
