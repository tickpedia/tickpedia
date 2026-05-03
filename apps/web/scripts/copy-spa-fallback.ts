// Build-time: copy `dist/index.html` → `dist/404.html` so GitHub
// Pages serves the SPA shell for any path it can't find on disk.
// The shell then runs the client-side router (matchRoute) and
// renders the right page. Works with the existing alias stubs:
// alias paths win because they exist as their own .html files; only
// truly-unknown paths fall through to 404.html.

import { copyFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

async function main(): Promise<void> {
  const distRoot = resolve(import.meta.dirname, '..', 'dist')
  const src = resolve(distRoot, 'index.html')
  const dest = resolve(distRoot, '404.html')

  // Fail loudly if vite build didn't run first.
  await stat(src)
  await copyFile(src, dest)
  console.log(`✓ copied SPA fallback → ${dest}`)
}

main().catch((err) => {
  console.error('✗ SPA fallback copy failed:', err)
  process.exit(1)
})
