import { defineStore } from 'pinia'
import { ref } from 'vue'

import { CONFIG_KEY, configStorage } from '@/platform/storage'
import { DEFAULT_CONFIG, migrate } from '@/shared/config'
import type { HyacinthConfig } from '@/shared/types'

/** 配置树 store：newtab 与 options 共用的唯一配置入口 */
export const useConfigStore = defineStore('config', () => {
  const config = ref<HyacinthConfig>(structuredClone(DEFAULT_CONFIG))
  const loaded = ref(false)

  async function load(): Promise<void> {
    config.value = migrate(await configStorage.get<HyacinthConfig>(CONFIG_KEY))
    loaded.value = true
  }

  async function save(): Promise<void> {
    await configStorage.set(CONFIG_KEY, config.value)
  }

  return { config, loaded, load, save }
})
