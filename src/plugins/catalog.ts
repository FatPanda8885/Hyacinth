import type { WidgetConstraints } from '@/widgets/registry'
import type { InstalledPlugin } from '@/shared/types'

/** 内置示例插件的目录项；远程插件（市场/URL 安装）由 InstalledPlugin 合成同构条目 */
export interface PluginCatalogEntry {
  id: string
  name: string
  description: string
  version: string
  permissions: string[]
  /** 内置插件为扩展内沙箱页面路径；远程插件为 https 入口 URL */
  entry: string
  constraints: WidgetConstraints
}

export const BUNDLED_PLUGINS: PluginCatalogEntry[] = [
  {
    id: 'countdown',
    name: '倒计时',
    description: '记录重要日子的倒计时挂件（演示 storage / theme / layout API）',
    version: '0.1.0',
    permissions: ['storage', 'theme', 'layout'],
    entry: 'src/plugins/countdown/index.html',
    constraints: { minW: 4, minH: 3, defaultW: 7, defaultH: 5 },
  },
  {
    id: 'hitokoto',
    name: '一言',
    description: '随机一句话，数据来自 hitokoto.cn（演示 fetch 域名白名单）',
    version: '0.1.0',
    permissions: ['storage', 'theme', 'fetch:v1.hitokoto.cn'],
    entry: 'src/plugins/hitokoto/index.html',
    constraints: { minW: 4, minH: 3, defaultW: 9, defaultH: 4 },
  },
]

const FALLBACK_CONSTRAINTS: WidgetConstraints = { minW: 3, minH: 2, defaultW: 6, defaultH: 4 }

export function getPluginEntry(id: string): PluginCatalogEntry | undefined {
  return BUNDLED_PLUGINS.find((p) => p.id === id)
}

/**
 * 解析插件的可执行条目：优先按安装记录（远程插件 entry 为完整 URL），
 * 其次内置目录；两者皆无（安装记录被手改坏）返回 undefined。
 */
export function resolvePluginEntry(
  id: string,
  installed: InstalledPlugin | undefined,
): PluginCatalogEntry | undefined {
  if (installed?.entryUrl) {
    return {
      id,
      name: installed.name || id,
      description: installed.description ?? '',
      version: installed.version || '0.0.0',
      permissions: [...installed.permissions],
      entry: installed.entryUrl,
      constraints: installed.constraints ?? FALLBACK_CONSTRAINTS,
    }
  }
  return getPluginEntry(id)
}

/** 插件在 config.widgets 里的存储命名空间 */
export function pluginStorageNamespace(pluginId: string): string {
  return `plugin:${pluginId}`
}

export function pluginWidgetType(id: string): string {
  return `plugin:${id}`
}

/** 槽位 widget 字段是否指向插件，是则返回插件 id */
export function parsePluginWidgetType(widget: string): string | null {
  if (!widget.startsWith('plugin:')) return null
  const id = widget.slice('plugin:'.length)
  return id || null
}
