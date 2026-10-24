/**
 * 浏览器 API 抽象层（大纲 3）：所有 chrome.* 调用收口在本目录，
 * 移植 Firefox 时只改这里。目前按需实现，不提前抽象。
 *
 * 开发时若直接以普通网页打开（无扩展上下文），自动退回 localStorage，
 * 方便在浏览器里单独调试 newtab/options 的 UI。
 */

export interface JsonStorage {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

function localStorageAdapter(): JsonStorage {
  return {
    async get<T>(key: string) {
      const raw = localStorage.getItem(key)
      return raw === null ? undefined : (JSON.parse(raw) as T)
    },
    async set<T>(key: string, value: T) {
      localStorage.setItem(key, JSON.stringify(value))
    },
    async remove(key: string) {
      localStorage.removeItem(key)
    },
  }
}

function chromeStorageAdapter(): JsonStorage {
  return {
    async get<T>(key: string) {
      const result = await chrome.storage.local.get(key)
      return result[key] as T | undefined
    },
    async set<T>(key: string, value: T) {
      await chrome.storage.local.set({ [key]: value })
    },
    async remove(key: string) {
      await chrome.storage.local.remove(key)
    },
  }
}

export function getStorage(): JsonStorage {
  return typeof chrome !== 'undefined' && chrome.storage?.local
    ? chromeStorageAdapter()
    : localStorageAdapter()
}

/** 配置树在 storage 里的键；挂件/插件配置都收纳在这棵树内（大纲 4.6） */
export const CONFIG_KEY = 'hyacinth:config'

export const configStorage = getStorage()

/** GitHub 同步的本地状态：凭据绝不放进配置树（否则会被同步出去） */
export interface SyncSettings {
  /** fine-grained PAT（仅 gists 读写权限）或 classic token（gist scope） */
  token: string
  /** 绑定的 secret gist id；首次推送前为空 */
  gistId: string | null
  /** token 对应的 GitHub 账号名（验证成功时记录） */
  login: string | null
  /** 配置保存后自动推送到云端 */
  autoPush: boolean
  lastPushAt: string | null
  lastPulledAt: string | null
}

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  token: '',
  gistId: null,
  login: null,
  autoPush: false,
  lastPushAt: null,
  lastPulledAt: null,
}

/** 同步状态在 storage 里的键（与配置树并列，不随同步分发） */
export const SYNC_KEY = 'hyacinth:sync'

export async function loadSyncSettings(): Promise<SyncSettings> {
  const raw = await configStorage.get<Partial<SyncSettings>>(SYNC_KEY)
  return { ...DEFAULT_SYNC_SETTINGS, ...raw }
}

export async function saveSyncSettings(settings: SyncSettings): Promise<void> {
  await configStorage.set(SYNC_KEY, settings)
}

/**
 * 监听某个键的外部变更（其他页面/设备的写入），返回取消函数。
 * 扩展上下文用 chrome.storage.onChanged；普通页面开发模式退化为
 * storage 事件（同源其他标签页写入才会触发，本页写入不触发，刚好符合需求）。
 */
export function onStorageChange(key: string, cb: (newValue: unknown) => void): () => void {
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && key in changes) {
        cb(changes[key]?.newValue)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }
  if (typeof window !== 'undefined') {
    const listener = (event: StorageEvent) => {
      if (event.key === key) {
        cb(event.newValue === null ? undefined : JSON.parse(event.newValue))
      }
    }
    window.addEventListener('storage', listener)
    return () => window.removeEventListener('storage', listener)
  }
  return () => {}
}
