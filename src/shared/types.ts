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

export type ThemeBackground = {
  type: 'gradient' | 'color' | 'image'
  /** 渐变/颜色为 CSS 值；图片为 URL */
  value: string
}

/** 主题定义：纯声明式（大纲 4.3），变量集 + 可选背景，不写逻辑 */
export type ThemeDefinition = {
  id: string
  name: string
  /** 只覆盖被主题接管的 --hy-* 变量 */
  variables: Record<string, string>
  background?: ThemeBackground
}

export type ThemeConfig = {
  id: string
  /** 用户/插件对主题变量的覆盖（叠加在主题定义之上） */
  variables: Record<string, string>
  /** 用户自定义背景；未设置时用主题自带背景 */
  background?: ThemeBackground
  /** 背景显示效果（模糊/亮度），属于用户偏好不随主题文件分发 */
  backgroundEffects?: BackgroundEffects
}

export type BackgroundEffects = {
  /** 高斯模糊半径 px，0-40 */
  blur: number
  /** 亮度百分比，100 = 原样，40-150 */
  brightness: number
}

/** 插件尺寸约束（结构同 widgets/registry 的 WidgetConstraints，避免反向依赖组件层） */
export type PluginConstraints = {
  minW: number
  minH: number
  defaultW: number
  defaultH: number
}

/** 已安装插件（M4 内置、M5 起含市场/URL 安装的远程插件） */
export interface InstalledPlugin {
  id: string
  name: string
  version: string
  enabled: boolean
  /** 声明的权限，如 ['storage', 'fetch:api.example.com'] */
  permissions: string[]
  /** 远程插件的入口页面 URL（https）；内置插件留空 */
  entryUrl?: string
  description?: string
  /** 远程插件自带的尺寸约束（内置插件以打包目录为准） */
  constraints?: PluginConstraints
}

/** 整棵配置树：chrome.storage.local 里的持久化结构 */
export interface HyacinthConfig {
  schemaVersion: number
  slots: Slot[]
  theme: ThemeConfig
  /** 用户导入的自定义主题 */
  customThemes: ThemeDefinition[]
  /** 挂件自己的配置命名空间：widgetType -> config */
  widgets: Record<string, Record<string, unknown>>
  plugins: InstalledPlugin[]
}
