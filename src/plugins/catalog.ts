import type { WidgetConstraints } from '@/widgets/registry'

/** 内置示例插件的目录项；M5 起第三方插件经市场安装，结构一致 */
export interface PluginCatalogEntry {
  id: string
  name: string
  description: string
  version: string
  permissions: string[]
  /** 沙箱页面在扩展内的路径 */
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

export function getPluginEntry(id: string): PluginCatalogEntry | undefined {
  return BUNDLED_PLUGINS.find((p) => p.id === id)
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
