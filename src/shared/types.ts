/** 配置树 schema 版本：结构变更时 +1 并在 shared/config.ts 里补迁移逻辑 */
export const SCHEMA_VERSION = 1

/** 画布上的一个挂件槽位（M2 布局引擎接管，M0 仅定形） */
export interface Slot {
  id: string
  /** 挂件类型，如 'clock' | 'search' | 'shortcuts' */
  widget: string
  /** 位置与尺寸，单位为虚拟网格单元（大纲 4.1） */
  x: number
  y: number
  w: number
  h: number
  /** 层级，越大越靠上 */
  z: number
}

export interface ThemeConfig {
  id: string
  /** 用户/插件对主题变量的覆盖，键形如 '--hy-bg' */
  variables: Record<string, string>
}

/** 已安装插件（M4+ 使用） */
export interface InstalledPlugin {
  id: string
  name: string
  version: string
  enabled: boolean
  /** 声明的权限，如 ['storage', 'fetch:api.example.com'] */
  permissions: string[]
}

/** 整棵配置树：chrome.storage.local 里的持久化结构 */
export interface HyacinthConfig {
  schemaVersion: number
  slots: Slot[]
  theme: ThemeConfig
  /** 挂件自己的配置命名空间：widgetType -> config */
  widgets: Record<string, Record<string, unknown>>
  plugins: InstalledPlugin[]
}
