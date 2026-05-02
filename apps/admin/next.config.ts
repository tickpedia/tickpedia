import type { NextConfig } from 'next'
import { loadEnvConfig } from '@next/env'
import { resolve } from 'node:path'

// Tickpedia keeps a single .env at the repo root so admin / web / db /
// scripts share one source of truth. Point Next at it.
//
// `forceReload: true` matters here — Next runs its own
// `loadEnvConfig(<project-root>)` (apps/admin) before this file
// loads. That populates an internal cache; without forceReload, our
// call against the repo root would return cached emptiness and
// process.env.DATABASE_URL would stay undefined at server-component
// runtime.
loadEnvConfig(resolve(import.meta.dirname, '..', '..'), undefined, undefined, true)

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Workspace packages publish raw TS / TSX (no build step). Next's
  // SWC compiler skips node_modules by default — opt these in so .ts
  // and .tsx files compile.
  transpilePackages: ['@tickpedia/ui'],
  // The @tickpedia/db and @tickpedia/ui packages use NodeNext-style
  // `.js` imports that refer to neighboring `.ts` / `.tsx` files.
  // Next's webpack doesn't resolve those by default — teach it to.
  webpack: (config) => {
    config.resolve = config.resolve ?? {}
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    }
    return config
  },
  // Skip transpiling the heavyweight server-only deps that the import
  // pages pull in.
  serverExternalPackages: ['xlsx', 'pg'],
}

export default config
