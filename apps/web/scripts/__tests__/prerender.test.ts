import { describe, it, expect } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { injectIntoTemplate, pathToOutputFile, loadDotenv } from '../prerender.js'

// The prerender script's pure helpers — covers the template-injection
// rules and the URL → file-path mapping. The orchestration (SemiLayer
// + dynamic SSR import + filesystem writes) is exercised by the e2e
// scenarios under `apps/e2e/src/scenarios/seo/`.

const TEMPLATE = `<!doctype html>
<html lang="en" data-theme="paper">
  <head>
    <meta charset="UTF-8" />
    <title>Tickpedia</title>
    <meta name="description" content="default description" />
    <link rel="stylesheet" href="/assets/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>
`

describe('injectIntoTemplate', () => {
  it('strips the default title and inserts the per-page head', () => {
    const out = injectIntoTemplate(TEMPLATE, {
      headHtml: '<title>X — Tickpedia</title>\n    <meta name="description" content="x">',
      bodyHtml: '<main>x</main>',
      dataScript: '<script>window.__TICKPEDIA_DATA__={}</script>',
    })
    expect(out).not.toContain('<title>Tickpedia</title>')
    expect(out).not.toContain('content="default description"')
    expect(out).toContain('<title>X — Tickpedia</title>')
    expect(out).toContain('content="x"')
  })

  it('preserves the stylesheet + module script tags from the shell', () => {
    const out = injectIntoTemplate(TEMPLATE, {
      headHtml: '<title>x</title>',
      bodyHtml: 'x',
      dataScript: '<script>1</script>',
    })
    expect(out).toContain('<link rel="stylesheet" href="/assets/index.css" />')
    expect(out).toContain('<script type="module" src="/assets/index.js"></script>')
  })

  it('wraps the body html inside #root and appends the data script', () => {
    const out = injectIntoTemplate(TEMPLATE, {
      headHtml: '<title>x</title>',
      bodyHtml: '<main data-testid="page">hello</main>',
      dataScript: '<script>window.__TICKPEDIA_DATA__={"k":1}</script>',
    })
    expect(out).toContain('<div id="root"><main data-testid="page">hello</main></div>')
    expect(out).toContain('<script>window.__TICKPEDIA_DATA__={"k":1}</script>')
  })
})

describe('pathToOutputFile', () => {
  // Use posix-style assertions on the suffix — path.resolve/path.join
  // produce drive-letter prefixes on Windows that would make exact
  // string matches platform-specific.
  function suffix(p: string): string {
    return p.replace(/\\/g, '/').replace(/^[A-Z]:/, '')
  }

  it('writes the home path to dist/index.html', () => {
    expect(suffix(pathToOutputFile('/dist', '/'))).toBe('/dist/index.html')
  })

  it('writes a tick page to dist/<segments>.html (matches alias-stub layout)', () => {
    expect(suffix(pathToOutputFile('/dist', '/ticks/lone-star-tick'))).toBe(
      '/dist/ticks/lone-star-tick.html',
    )
  })

  it('handles deeper paths correctly', () => {
    expect(suffix(pathToOutputFile('/dist', '/ticks/lone-star-tick/range'))).toBe(
      '/dist/ticks/lone-star-tick/range.html',
    )
  })

  it('strips trailing slashes', () => {
    expect(suffix(pathToOutputFile('/dist', '/ticks/x/'))).toBe('/dist/ticks/x.html')
  })
})

describe('loadDotenv', () => {
  function withTmpEnv<T>(contents: string, fn: (path: string) => T): T {
    const dir = mkdtempSync(resolve(tmpdir(), 'pre-render-env-'))
    const envPath = resolve(dir, '.env')
    writeFileSync(envPath, contents, 'utf8')
    try {
      return fn(envPath)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  it('does nothing when the file is missing', () => {
    const before = process.env.SOME_KEY_THAT_DOES_NOT_EXIST_123
    loadDotenv('/no/such/file.env')
    expect(process.env.SOME_KEY_THAT_DOES_NOT_EXIST_123).toBe(before)
  })

  it('loads KEY=VALUE pairs into process.env', () => {
    delete process.env.PRERENDER_TEST_KEY_A
    withTmpEnv('PRERENDER_TEST_KEY_A=hello\n', loadDotenv)
    expect(process.env.PRERENDER_TEST_KEY_A).toBe('hello')
    delete process.env.PRERENDER_TEST_KEY_A
  })

  it('strips matching surrounding quotes', () => {
    delete process.env.PRERENDER_TEST_KEY_B
    withTmpEnv('PRERENDER_TEST_KEY_B="quoted value"\n', loadDotenv)
    expect(process.env.PRERENDER_TEST_KEY_B).toBe('quoted value')
    delete process.env.PRERENDER_TEST_KEY_B
  })

  it('ignores comments and blank lines', () => {
    delete process.env.PRERENDER_TEST_KEY_C
    withTmpEnv('# comment\n\nPRERENDER_TEST_KEY_C=x\n', loadDotenv)
    expect(process.env.PRERENDER_TEST_KEY_C).toBe('x')
    delete process.env.PRERENDER_TEST_KEY_C
  })

  it('does not overwrite shell-exported values', () => {
    process.env.PRERENDER_TEST_KEY_D = 'from-shell'
    withTmpEnv('PRERENDER_TEST_KEY_D=from-file\n', loadDotenv)
    expect(process.env.PRERENDER_TEST_KEY_D).toBe('from-shell')
    delete process.env.PRERENDER_TEST_KEY_D
  })
})
