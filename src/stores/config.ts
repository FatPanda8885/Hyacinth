import { defineStore } from 'pinia'
import { ref } from 'vue'

import { CONFIG_KEY, configStorage, onStorageChange } from '@/platform/storage'
import { DEFAULT_CONFIG, migrate } from '@/shared/config'
import type { HyacinthConfig } from '@/shared/types'

export type SaveState = 'idle' | 'pending' | 'saved'

/**
 * 配置树 store：newtab 与 options 共用的唯一配置入口。
 *
 * - options 页：updateWidget() 修改后自动防抖保存，flush() 立即落盘
 * - newtab 页：只读展示；外部变更（options 页修改）实时刷新
 */
export const useConfigStore = defineStore('config', () => {
  const config = ref<HyacinthConfig>(structuredClone(DEFAULT_CONFIG))
  const loaded = ref(false)
  const saveState = ref<SaveState>('idle')

  let unbindStorage: (() => void) | null = null
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let savePending = false

  /** 载入配置并开始监听外部变更；各入口 App 挂载时调用一次 */
  async function init(): Promise<void> {
    if (unbindStorage) return // 已初始化
    unbindStorage = onStorageChange(CONFIG_KEY, (value) => {
      // 自己的写入触发的回声在 pending 期间忽略；外部写入则刷新
      if (!savePending) {
        config.value = migrate(value)
      }
    })
    await load()
  }

  async function load(): Promise<void> {
    config.value = migrate(await configStorage.get<HyacinthConfig>(CONFIG_KEY))
    loaded.value = true
  }

  /** 确保某挂件的配置命名空间存在且包含全部默认键（不覆盖用户值、不触发保存） */
  function ensureWidgetDefaults(type: string, defaults: Record<string, unknown>): void {
    const existing = config.value.widgets[type]
    config.value.widgets[type] = { ...defaults, ...existing }
  }

  /** 合并式更新某挂件配置并自动保存 */
  function updateWidget(type: string, patch: Record<string, unknown>): void {
    const existing = config.value.widgets[type]
    config.value.widgets[type] = { ...existing, ...patch }
    scheduleSave()
  }

  /** 移除某挂件的整个配置命名空间（挂件卸载时用） */
  function resetWidget(type: string): void {
    delete config.value.widgets[type]
    scheduleSave()
  }

  function scheduleSave(): void {
    savePending = true
    saveState.value = 'pending'
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => void flush())
  }

  /** 立即落盘（防抖到期自动调用；页面卸载前也应调用） */
  async function flush(): Promise<void> {
    clearTimeout(saveTimer)
    if (!savePending) return
    await configStorage.set(CONFIG_KEY, config.value)
    savePending = false
    saveState.value = 'saved'
    setTimeout(() => {
      if (saveState.value === 'saved') saveState.value = 'idle'
    }, 1500)
  }

  return {
    config,
    loaded,
    saveState,
    init,
    load,
    ensureWidgetDefaults,
    updateWidget,
    resetWidget,
    flush,
  }
})
