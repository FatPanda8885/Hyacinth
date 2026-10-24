import { DEFAULT_CONFIG } from '@/shared/config'
import { CONFIG_KEY, configStorage } from '@/platform/storage'

// 安装/更新时确保配置树存在；日常新标签页读取由 stores/config 完成
chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await configStorage.get(CONFIG_KEY)
  if (existing === undefined) {
    await configStorage.set(CONFIG_KEY, DEFAULT_CONFIG)
  }
  if (details.reason === 'install') {
    console.info('[Hyacinth] installed, config initialized')
  }
})
