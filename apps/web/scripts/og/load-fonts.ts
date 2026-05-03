// Resolve the OG generator's font buffers off disk. satori needs each
// face passed in as `{ name, data, weight, style }` — there's no
// runtime CSS resolution, no `@font-face`, no font fallback chain.
// Match names + weights to what the templates ask for.

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const FONTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'fonts')

export interface OgFont {
  name: string
  data: Buffer
  weight: 400 | 500 | 600 | 700
  style: 'normal' | 'italic'
}

/**
 * Load every OG font once. The generator calls this once at startup
 * and passes the result to every `render-png.ts` call.
 */
export async function loadOgFonts(): Promise<OgFont[]> {
  const [
    newsreaderMedium,
    newsreaderMediumItalic,
    geistMedium,
    geistSemiBold,
    jetbrainsMonoMedium,
  ] = await Promise.all([
    readFile(resolve(FONTS_DIR, 'newsreader-500.ttf')),
    readFile(resolve(FONTS_DIR, 'newsreader-italic-500.ttf')),
    readFile(resolve(FONTS_DIR, 'geist-500.ttf')),
    readFile(resolve(FONTS_DIR, 'geist-600.ttf')),
    readFile(resolve(FONTS_DIR, 'jetbrains-mono-500.ttf')),
  ])

  return [
    { name: 'Newsreader',     data: newsreaderMedium,        weight: 500, style: 'normal' },
    { name: 'Newsreader',     data: newsreaderMediumItalic,  weight: 500, style: 'italic' },
    { name: 'Geist',          data: geistMedium,             weight: 500, style: 'normal' },
    { name: 'Geist',          data: geistSemiBold,           weight: 600, style: 'normal' },
    { name: 'JetBrains Mono', data: jetbrainsMonoMedium,     weight: 500, style: 'normal' },
  ]
}
