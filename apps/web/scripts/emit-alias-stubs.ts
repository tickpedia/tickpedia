// Build-time: walk `src/aliases.ts` and emit `dist/<from>.html` for
// every alias. Runs after `vite build` (see package.json's
// `build:aliases` and `postbuild`).
//
// The stubs are static HTML — meta refresh + canonical link — so they
// work on GitHub Pages without server config. We use a `.html` file
// (not `<from>/index.html`) so both `vite preview` and GitHub Pages
// serve the alias for `/<from>` without requiring a trailing slash.

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { ALIASES, renderAliasStub } from '../src/aliases.js'

async function main(): Promise<void> {
  const distRoot = resolve(import.meta.dirname, '..', 'dist')
  let written = 0

  for (const alias of ALIASES) {
    if (!alias.from.startsWith('/')) {
      throw new Error(`alias.from must start with /: ${alias.from}`)
    }
    if (!alias.to.startsWith('/')) {
      throw new Error(`alias.to must start with /: ${alias.to}`)
    }
    // /foo/bar → dist/foo/bar.html
    const filePath = resolve(distRoot, '.' + alias.from + '.html')
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, renderAliasStub(alias), 'utf8')
    written += 1
  }

  console.log(`✓ emitted ${written} alias stub${written === 1 ? '' : 's'} → ${distRoot}`)
}

main().catch((err) => {
  console.error('✗ alias stub emit failed:', err)
  process.exit(1)
})
