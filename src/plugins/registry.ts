/**
 * 插件市场索引（registry）：拉取、校验、安装装换（大纲 M5）。
 *
 * registry 是一个可公开访问的 JSON 文件（官方仓库 hyacinth-plugins），
 * 结构与校验规则见 docs/plugin-dev.md；这里做逐项形状守卫，坏条目整条丢弃。
 */
import { BASE_PERMISSIONS, parseFetchPermission } from '@/plugin-sdk/protocol'
import type { InstalledPlugin, PluginConstraints } from '@/shared/types'

/** 官方索引地址；用户可在设置页换成自建镜像或私有索引 */
export const DEFAULT_REGISTRY_URL =
  'https://raw.githubusercontent.com/FatPanda8885/hyacinth-plugins/main/registry.json'

/** registry.json 里的一条插件记录 */
export type RegistryEntry = {
  id: string
  name: string
  description: string
  version: string
  author?: string
  entryUrl: string
  permissions: string[]
  constraints?: PluginConstraints
}

export type PluginRegistry = {
  v: 1
  plugins: RegistryEntry[]
}

export class RegistryError extends Error {}

/** 插件 id：小写字母数字与连字符，防注入 config 命名空间 */
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

export function isValidPluginId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id)
}

/** 权限串：基础权限或 fetch:<host>（复用协议的域名解析规则） */
export function isValidPermission(p: unknown): p is string {
  return (
    (typeof p === 'string' && (BASE_PERMISSIONS as readonly string[]).includes(p)) ||
    (typeof p === 'string' && p.startsWith('fetch:') && parseFetchPermission(p) !== null)
  )
}

function normalizeConstraints(raw: unknown): PluginConstraints | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const c = raw as Partial<Record<keyof PluginConstraints, unknown>>
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : null
  const minW = num(c.minW)
  const minH = num(c.minH)
  const defaultW = num(c.defaultW)
  const defaultH = num(c.defaultH)
  if (!minW || !minH || !defaultW || !defaultH) return undefined
  return {
    minW: Math.min(minW, defaultW),
    minH: Math.min(minH, defaultH),
    defaultW,
    defaultH,
  }
}

/** 校验单条索引记录，坏记录返回 null（不拖垮整个列表） */
export function parseRegistryEntry(raw: unknown): RegistryEntry | null {
  if (typeof raw !== 'object' || raw === null) return null
  const e = raw as Partial<RegistryEntry>
  if (!isValidPluginId(e.id)) return null
  if (typeof e.name !== 'string' || !e.name.trim() || e.name.length > 40) return null
  if (typeof e.version !== 'string' || !/^\d+(\.\d+){0,3}$/.test(e.version)) return null
  // 入口必须是 https（http 仅限本机回环，便于本地调试插件）
  if (typeof e.entryUrl !== 'string') return null
  let url: URL
  try {
    url = new URL(e.entryUrl)
  } catch {
    return null
  }
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal)) return null
  if (!Array.isArray(e.permissions) || !e.permissions.every(isValidPermission)) return null
  return {
    id: e.id,
    name: e.name.trim(),
    description: typeof e.description === 'string' ? e.description.slice(0, 200) : '',
    version: e.version,
    author: typeof e.author === 'string' ? e.author.slice(0, 40) : undefined,
    entryUrl: e.entryUrl,
    permissions: [...e.permissions],
    constraints: normalizeConstraints(e.constraints),
  }
}

/** 解析整份索引：v 必须为 1，条目逐条校验后按 id 去重（保留首个） */
export function parseRegistry(raw: unknown): PluginRegistry {
  if (typeof raw !== 'object' || raw === null) throw new RegistryError('索引格式错误')
  const data = raw as { v?: unknown; plugins?: unknown }
  if (data.v !== 1) throw new RegistryError(`不支持的索引版本：${String(data.v)}`)
  if (!Array.isArray(data.plugins)) throw new RegistryError('索引缺少 plugins 列表')
  const seen = new Set<string>()
  const plugins: RegistryEntry[] = []
  for (const item of data.plugins) {
    const entry = parseRegistryEntry(item)
    if (!entry || seen.has(entry.id)) continue
    seen.add(entry.id)
    plugins.push(entry)
  }
  return { v: 1, plugins }
}

/** 拉取并解析索引（网络错误/HTTP 非 2xx 都抛 RegistryError） */
export async function fetchRegistry(url = DEFAULT_REGISTRY_URL): Promise<PluginRegistry> {
  let res: Response
  try {
    res = await fetch(url, { credentials: 'omit' })
  } catch {
    throw new RegistryError('无法访问索引（网络错误或被拦截）')
  }
  if (!res.ok) throw new RegistryError(`索引请求失败：HTTP ${res.status}`)
  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new RegistryError('索引不是合法 JSON')
  }
  return parseRegistry(body)
}

/** 索引条目 → 安装记录 */
export function toInstalled(entry: RegistryEntry): InstalledPlugin {
  return {
    id: entry.id,
    name: entry.name,
    version: entry.version,
    enabled: true,
    permissions: [...entry.permissions],
    entryUrl: entry.entryUrl,
    description: entry.description,
    constraints: entry.constraints
      ? { ...entry.constraints }
      : { minW: 3, minH: 2, defaultW: 6, defaultH: 4 },
  }
}
