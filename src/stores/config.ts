import { defineStore } from 'pinia'
import { ref } from 'vue'

import { CONFIG_KEY, configStorage, onStorageChange } from '@/platform/storage'
import { DEFAULT_CONFIG, DEFAULT_THEME_ID, migrate } from '@/shared/config'
import type {
  BackgroundEffects,
  HyacinthConfig,
  InstalledPlugin,
  Slot,
  ThemeBackground,
  ThemeDefinition,
} from '@/shared/types'

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

  /** 整体替换某挂件的配置命名空间（插件存储删除键等场景需要覆盖而非合并） */
  function setWidgetConfig(type: string, data: Record<string, unknown>): void {
    config.value.widgets[type] = data
    scheduleSave()
  }

  /** 移除某挂件的整个配置命名空间（挂件卸载时用） */
  function resetWidget(type: string): void {
    delete config.value.widgets[type]
    scheduleSave()
  }

  /** 整体替换画布槽位（布局引擎提交拖拽/缩放结果时调用） */
  function setSlots(slots: Slot[]): void {
    config.value.slots = slots
    scheduleSave()
  }

  /** 切换主题 */
  function setThemeId(id: string): void {
    config.value.theme.id = id
    scheduleSave()
  }

  /** 设置/清除用户背景覆盖（undefined = 跟随主题自带背景） */
  function setBackgroundOverride(bg: ThemeBackground | undefined): void {
    if (bg) {
      config.value.theme.background = bg
    } else {
      delete config.value.theme.background
    }
    scheduleSave()
  }

  /** 设置背景显示效果（undefined = 恢复默认） */
  function setBackgroundEffects(effects: BackgroundEffects | undefined): void {
    if (effects) {
      config.value.theme.backgroundEffects = effects
    } else {
      delete config.value.theme.backgroundEffects
    }
    scheduleSave()
  }

  /** 新增/替换自定义主题（同 id 覆盖） */
  function upsertCustomTheme(theme: ThemeDefinition): void {
    config.value.customThemes = [
      ...config.value.customThemes.filter((t) => t.id !== theme.id),
      theme,
    ]
    scheduleSave()
  }

  function removeCustomTheme(id: string): void {
    if (config.value.theme.id === id) {
      config.value.theme.id = DEFAULT_THEME_ID
    }
    config.value.customThemes = config.value.customThemes.filter((t) => t.id !== id)
    scheduleSave()
  }

  /** 新增/更新已安装插件记录（同 id 覆盖） */
  function upsertPlugin(plugin: InstalledPlugin): void {
    config.value.plugins = [...config.value.plugins.filter((p) => p.id !== plugin.id), plugin]
    scheduleSave()
  }

  /** 卸载插件：移除安装记录、画布槽位与其存储命名空间 */
  function uninstallPlugin(id: string): void {
    const ns = `plugin:${id}`
    config.value.plugins = config.value.plugins.filter((p) => p.id !== id)
    config.value.slots = config.value.slots.filter((s) => s.widget !== ns)
    if (config.value.widgets[ns] !== undefined) {
      const widgets = { ...config.value.widgets }
      delete widgets[ns]
      config.value.widgets = widgets
    }
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
    setWidgetConfig,
    resetWidget,
    setSlots,
    setThemeId,
    setBackgroundOverride,
    setBackgroundEffects,
    upsertCustomTheme,
    removeCustomTheme,
    upsertPlugin,
    uninstallPlugin,
    flush,
  }
})
