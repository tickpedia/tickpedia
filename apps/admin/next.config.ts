import type { NextConfig } from 'next'
import { loadEnvConfig } from '@next/env'
import { resolve } from 'node:path'

// Tickpedia keeps a single .env at the repo root so admin / web / db /
// scripts share one source of truth. Point Next at it.
loadEnvConfig(resolve(import.meta.dirname, '..', '..'))

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
}

export default config
