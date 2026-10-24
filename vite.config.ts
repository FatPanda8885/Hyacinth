import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import { defineConfig } from 'vite'

import manifest from './manifest.config.ts'

export default defineConfig({
  plugins: [vue(), crx({ manifest })],
  // 沙箱插件 iframe 是 opaque origin，module script 按 CORS 拉取；
  // Vite 5+ 默认只放行同源，会拦掉沙箱页的开发加载（生产构建为扩展内同源，不受影响）
  server: {
    cors: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
