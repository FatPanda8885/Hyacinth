import { computed, watchEffect, type ComputedRef } from 'vue'

import { useConfigStore } from '@/stores/config'
import type { BackgroundEffects } from '@/shared/types'

import {
  applyThemeToDocument,
  findTheme,
  normalizeEffects,
  resolveTheme,
  type ResolvedTheme,
} from './apply'

/**
 * 在当前页面接入主题：解析生效主题（含用户覆盖）并持续应用到 documentElement。
 * newtab 与 options 都调用一次；配置变化（含跨页同步）自动重新应用。
 */
export function useTheme(): {
  theme: ComputedRef<ResolvedTheme>
  effects: ComputedRef<BackgroundEffects>
} {
  const store = useConfigStore()
  const theme = computed(() =>
    resolveTheme(
      findTheme(store.config.theme.id, store.config.customThemes),
      store.config.theme.variables,
      store.config.theme.background,
    ),
  )
  const effects = computed(() => normalizeEffects(store.config.theme.backgroundEffects))
  watchEffect(() => {
    if (!store.loaded) return
    applyThemeToDocument(theme.value.variables)
  })
  return { theme, effects }
}
