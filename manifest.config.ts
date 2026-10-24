import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Hyacinth',
  short_name: 'Hyacinth',
  version: '0.1.0',
  description: '简洁、高度可定制的新标签页：主题 + 插件。',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  chrome_url_overrides: {
    newtab: 'src/newtab/index.html',
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true,
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  sandbox: {
    pages: ['src/plugins/countdown/index.html', 'src/plugins/hitokoto/index.html'],
  },
  // M5：画布 iframe 允许加载远程插件页（沙箱内运行，宿主页面脚本不受影响）；
  // http 仅放行本机回环，供插件开发者本地调试
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'self'; frame-src 'self' https: http://localhost:* http://127.0.0.1:*",
  },
  optional_host_permissions: ['https://*/*'],
  permissions: ['storage'],
  minimum_chrome_version: '116',
})
