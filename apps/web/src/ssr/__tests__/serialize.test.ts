import { describe, it, expect } from 'vitest'
import { serializeDataCache, escapeForScript } from '../serialize.js'

const U_LINE_SEP = String.fromCharCode(0x2028)
const U_PARA_SEP = String.fromCharCode(0x2029)

describe('serializeDataCache', () => {
  it('round-trips a typical cache via JSON.parse', () => {
    const cache = {
      'tick:blacklegged-tick': { id: 1, slug: 'blacklegged-tick', commonName: 'Blacklegged tick' },
      'tickRange:1': { byStateFips: { '23': 14, '36': 22 }, spread: [{ year: 2010, counties: 5 }] },
    }
    const out = serializeDataCache(cache)
    expect(JSON.parse(out)).toEqual(cache)
  })

  it('escapes </script> closers so payloads cannot break out of the tag', () => {
    const cache = { 'fact:1': { body: 'oops </script><script>alert(1)</script>' } }
    const out = serializeDataCache(cache)
    expect(out).not.toContain('</script')
    expect(out).toContain('\\u003c/script')
    const parsed = JSON.parse(out) as typeof cache
    expect(parsed['fact:1']?.body).toContain('</script>')
  })
})

describe('escapeForScript', () => {
  it('replaces U+2028 (line separator) with its JSON escape', () => {
    const input = `{"x":"a${U_LINE_SEP}b"}`
    const out = escapeForScript(input)
    expect(out).not.toContain(U_LINE_SEP)
    expect(out).toContain('\\u2028')
  })

  it('replaces U+2029 (paragraph separator) with its JSON escape', () => {
    const input = `{"x":"a${U_PARA_SEP}b"}`
    const out = escapeForScript(input)
    expect(out).not.toContain(U_PARA_SEP)
    expect(out).toContain('\\u2029')
  })

  it('is idempotent for plain ASCII JSON', () => {
    const input = `{"a":1,"b":[2,3]}`
    expect(escapeForScript(input)).toBe(input)
  })
})
