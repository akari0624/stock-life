import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@stock-life/engine': path.resolve(import.meta.dirname, '../../packages/engine/src'),
    },
  },
  test: {
    name: 'cms',
    environment: 'jsdom',
    setupFiles: ['src/__tests__/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
})
