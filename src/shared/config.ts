import type { HyacinthConfig } from './types'
import { SCHEMA_VERSION } from './types'

export const DEFAULT_CONFIG: HyacinthConfig = {
  schemaVersion: SCHEMA_VERSION,
  slots: [],
  theme: { id: 'default', variables: {} },
  widgets: {},
  plugins: [],
}

/**
 * 把任意持久化数据修整为当前 schema 的配置树。
 * 现在 schema 只有 v1；以后版本升级时在这里按 schemaVersion 逐级迁移。
 */
export function migrate(raw: unknown): HyacinthConfig {
  if (typeof raw !== 'object' || raw === null) {
    return structuredClone(DEFAULT_CONFIG)
  }
  const data = raw as Partial<HyacinthConfig>
  return {
    ...structuredClone(DEFAULT_CONFIG),
    ...data,
    schemaVersion: SCHEMA_VERSION,
    theme: { ...DEFAULT_CONFIG.theme, ...(data.theme ?? {}) },
    slots: Array.isArray(data.slots) ? data.slots : [],
    widgets: data.widgets && typeof data.widgets === 'object' ? data.widgets : {},
    plugins: Array.isArray(data.plugins) ? data.plugins : [],
  }
}
