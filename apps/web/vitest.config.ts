import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/beam': resolve(import.meta.dirname, '..', '..', 'generated', 'semilayer'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/test/**', '**/*.config.*'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
})
