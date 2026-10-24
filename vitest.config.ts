import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

// 独立于 vite.config.ts：单测不需要加载 CRXJS 插件
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
