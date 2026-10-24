import { computed, watchEffect, type ComputedRef } from 'vue'

import { useConfigStore } from '@/stores/config'

import { applyThemeToDocument, findTheme, resolveTheme, type ResolvedTheme } from './apply'

/**
 * 在当前页面接入主题：解析生效主题（含用户覆盖）并持续应用到 documentElement。
 * newtab 与 options 都调用一次；配置变化（含跨页同步）自动重新应用。
 */
export function useTheme(): ComputedRef<ResolvedTheme> {
  const store = useConfigStore()
  const resolved = computed(() =>
    resolveTheme(
      findTheme(store.config.theme.id, store.config.customThemes),
      store.config.theme.variables,
      store.config.theme.background,
    ),
  )
  watchEffect(() => {
    if (!store.loaded) return
    applyThemeToDocument(resolved.value.variables)
  })
  return resolved
}
