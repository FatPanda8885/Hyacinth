import { normalizeSlots } from '@/core/layout/slots'
import { normalizeEffects, sanitizeVariables } from '@/themes/apply'

import type { HyacinthConfig, Slot, ThemeBackground } from './types'
import { SCHEMA_VERSION } from './types'

export const DEFAULT_THEME_ID = 'night'

/** 首次安装的默认槽位：时钟居上、搜索居中、快捷方式在下（网格单位） */
export const DEFAULT_SLOTS: Slot[] = [
  { id: 'slot-clock', widget: 'clock', x: 8, y: 2, w: 8, h: 6, z: 0 },
  { id: 'slot-search', widget: 'search', x: 7, y: 11, w: 10, h: 3, z: 1 },
  { id: 'slot-shortcuts', widget: 'shortcuts', x: 5, y: 17, w: 14, h: 6, z: 2 },
]

export const DEFAULT_CONFIG: HyacinthConfig = {
  schemaVersion: SCHEMA_VERSION,
  slots: structuredClone(DEFAULT_SLOTS),
  theme: { id: DEFAULT_THEME_ID, variables: {} },
  customThemes: [],
  widgets: {},
  plugins: [],
}

function isValidBackground(raw: unknown): raw is ThemeBackground {
  if (typeof raw !== 'object' || raw === null) return false
  const bg = raw as Partial<ThemeBackground>
  return (
    (bg.type === 'gradient' || bg.type === 'color' || bg.type === 'image') &&
    typeof bg.value === 'string' &&
    bg.value.length > 0
  )
}

/**
 * 把任意持久化数据修整为当前 schema 的配置树。
 * - M1 及更早：空 slots 回种默认布局
 * - M2 及更早：widgets.background（M1 背景设置）收编为 theme.background
 */
export function migrate(raw: unknown): HyacinthConfig {
  if (typeof raw !== 'object' || raw === null) {
    return structuredClone(DEFAULT_CONFIG)
  }
  const data = raw as Partial<HyacinthConfig>

  const widgets =
    data.widgets && typeof data.widgets === 'object'
      ? { ...data.widgets }
      : ({ ...DEFAULT_CONFIG.widgets } as Record<string, Record<string, unknown>>)

  // 旧背景设置迁移进主题
  let background: ThemeBackground | undefined
  if (isValidBackground(data.theme?.background)) {
    background = data.theme?.background
  } else if (isValidBackground(widgets.background)) {
    background = widgets.background
  }
  delete widgets.background

  const slots = normalizeSlots(data.slots)
  return {
    ...structuredClone(DEFAULT_CONFIG),
    ...data,
    schemaVersion: SCHEMA_VERSION,
    theme: {
      // M1/M2 时代的 'default' 映射为 'night'；未知 id（如已删除的自定义主题）交给 findTheme 兜底
      id:
        data.theme?.id === 'default'
          ? DEFAULT_THEME_ID
          : typeof data.theme?.id === 'string'
            ? data.theme.id
            : DEFAULT_THEME_ID,
      variables: sanitizeVariables(data.theme?.variables),
      ...(background ? { background } : {}),
      backgroundEffects: normalizeEffects(data.theme?.backgroundEffects),
    },
    customThemes: Array.isArray(data.customThemes)
      ? data.customThemes.filter((t) => typeof t?.id === 'string' && typeof t?.name === 'string')
      : [],
    slots: slots.length > 0 ? slots : structuredClone(DEFAULT_SLOTS),
    widgets,
    plugins: Array.isArray(data.plugins) ? data.plugins : [],
  }
}
