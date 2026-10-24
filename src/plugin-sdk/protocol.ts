/**
 * Hyacinth 插件协议（大纲 4.4）
 *
 * 插件以沙箱 iframe 运行，与宿主只通过 postMessage 通信：
 *   插件 → 宿主：hello / rpc
 *   宿主 → 插件：init / theme / rpc-result
 *
 * 每条消息带协议版本 v；宿主拒绝不认识的版本。
 * 所有 RPC 先过权限清单（permissions），再分发服务。
 */

export const PROTOCOL_VERSION = 1

// ---- 权限模型 ----

/** 权限项：基础能力或 fetch 域名白名单（fetch:<host>，host 可为 *.domain 通配子域） */
export type PermissionString = string

export const BASE_PERMISSIONS = ['storage', 'theme', 'layout', 'settings'] as const

export function parseFetchPermission(p: string): { host: string; wildcard: boolean } | null {
  if (!p.startsWith('fetch:')) return null
  const host = p.slice('fetch:'.length).toLowerCase()
  if (!host) return null
  if (host.startsWith('*.')) {
    const base = host.slice(2)
    return /^[a-z0-9.-]+$/.test(base) && base.includes('.') ? { host: base, wildcard: true } : null
  }
  return /^[a-z0-9.-]+$/.test(host) && host.includes('.') ? { host, wildcard: false } : null
}

/** fetch: 白名单是否覆盖该 URL（仅 http/https；通配符覆盖子域） */
export function fetchAllowed(permissions: string[], rawUrl: string): boolean {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  const host = url.hostname.toLowerCase()
  return permissions.some((p) => {
    const rule = parseFetchPermission(p)
    if (!rule) return false
    if (rule.wildcard) {
      return host === rule.host || host.endsWith(`.${rule.host}`)
    }
    return host === rule.host
  })
}

// ---- RPC 方法与参数 ----

export const RPC_METHODS = [
  'storage.get',
  'storage.set',
  'storage.remove',
  'theme.get',
  'layout.resize',
  'settings.open',
  'fetch',
] as const

export type RpcMethod = (typeof RPC_METHODS)[number]

export type RpcRequest =
  | { method: 'storage.get'; params: { key: string } }
  | { method: 'storage.set'; params: { key: string; value: unknown } }
  | { method: 'storage.remove'; params: { key: string } }
  | { method: 'theme.get'; params: Record<string, never> }
  | { method: 'layout.resize'; params: { w: number; h: number } }
  | { method: 'settings.open'; params: Record<string, never> }
  | { method: 'fetch'; params: { url: string } }

/** 插件存储键：窄而安全，避免当任意 JSON 树用 */
export const STORAGE_KEY_RE = /^[\w.-]{1,64}$/

export function isValidStorageKey(key: unknown): key is string {
  return typeof key === 'string' && STORAGE_KEY_RE.test(key)
}

/** RPC 是否被权限清单允许（params 参与判定：fetch 看 URL） */
export function rpcAllowed(permissions: string[], req: RpcRequest): boolean {
  switch (req.method) {
    case 'storage.get':
    case 'storage.set':
    case 'storage.remove':
      return permissions.includes('storage')
    case 'theme.get':
      return permissions.includes('theme')
    case 'layout.resize':
      return permissions.includes('layout')
    case 'settings.open':
      return permissions.includes('settings')
    case 'fetch':
      return fetchAllowed(permissions, req.params.url)
  }
}

// ---- 消息结构 ----

export type PluginToHost =
  | { v: number; type: 'hello'; protocol: number }
  | { v: number; type: 'rpc'; id: string; method: RpcMethod; params: unknown }

export type HostToPlugin =
  | {
      v: number
      type: 'init'
      protocol: number
      payload: { permissions: string[]; theme: Record<string, string> }
    }
  | { v: number; type: 'theme'; payload: Record<string, string> }
  | { v: number; type: 'rpc-result'; id: string; ok: true; result: unknown }
  | { v: number; type: 'rpc-result'; id: string; ok: false; error: string }

/** 校验来自插件的消息形状（宿主侧信任边界的第一道闸） */
export function parsePluginMessage(raw: unknown): PluginToHost | null {
  if (typeof raw !== 'object' || raw === null) return null
  const msg = raw as Record<string, unknown>
  if (msg.v !== PROTOCOL_VERSION) return null
  if (msg.type === 'hello' && typeof msg.protocol === 'number') {
    return { v: PROTOCOL_VERSION, type: 'hello', protocol: msg.protocol }
  }
  if (
    msg.type === 'rpc' &&
    typeof msg.id === 'string' &&
    msg.id.length <= 64 &&
    (RPC_METHODS as readonly string[]).includes(msg.method as string)
  ) {
    return {
      v: PROTOCOL_VERSION,
      type: 'rpc',
      id: msg.id,
      method: msg.method as RpcMethod,
      params: msg.params,
    }
  }
  return null
}

/** 组装 rpc-result */
export function rpcOk(id: string, result: unknown): HostToPlugin {
  return { v: PROTOCOL_VERSION, type: 'rpc-result', id, ok: true, result }
}

export function rpcErr(id: string, error: string): HostToPlugin {
  return { v: PROTOCOL_VERSION, type: 'rpc-result', id, ok: false, error }
}
