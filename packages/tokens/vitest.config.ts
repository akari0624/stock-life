import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'tokens',
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
})
