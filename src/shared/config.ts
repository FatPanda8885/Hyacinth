import { normalizeSlots } from '@/core/layout/slots'

import type { HyacinthConfig, Slot } from './types'
import { SCHEMA_VERSION } from './types'

/** 首次安装的默认槽位：时钟居上、搜索居中、快捷方式在下（网格单位） */
export const DEFAULT_SLOTS: Slot[] = [
  { id: 'slot-clock', widget: 'clock', x: 8, y: 2, w: 8, h: 6, z: 0 },
  { id: 'slot-search', widget: 'search', x: 7, y: 11, w: 10, h: 3, z: 1 },
  { id: 'slot-shortcuts', widget: 'shortcuts', x: 5, y: 17, w: 14, h: 6, z: 2 },
]

export const DEFAULT_CONFIG: HyacinthConfig = {
  schemaVersion: SCHEMA_VERSION,
  slots: structuredClone(DEFAULT_SLOTS),
  theme: { id: 'default', variables: {} },
  widgets: {},
  plugins: [],
}

/**
 * 把任意持久化数据修整为当前 schema 的配置树。
 * M1 及更早版本没有 slots（固定布局），空槽位回种默认布局；
 * 正常升级路线在这里按 schemaVersion 逐级迁移。
 */
export function migrate(raw: unknown): HyacinthConfig {
  if (typeof raw !== 'object' || raw === null) {
    return structuredClone(DEFAULT_CONFIG)
  }
  const data = raw as Partial<HyacinthConfig>
  const slots = normalizeSlots(data.slots)
  return {
    ...structuredClone(DEFAULT_CONFIG),
    ...data,
    schemaVersion: SCHEMA_VERSION,
    theme: { ...DEFAULT_CONFIG.theme, ...(data.theme ?? {}) },
    slots: slots.length > 0 ? slots : structuredClone(DEFAULT_SLOTS),
    widgets: data.widgets && typeof data.widgets === 'object' ? data.widgets : {},
    plugins: Array.isArray(data.plugins) ? data.plugins : [],
  }
}
