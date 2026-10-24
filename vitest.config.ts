import { defineConfig } from 'vitest/config'

/* Testes das bibliotecas puras (sem DOM). Rode com `npm test`. */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
