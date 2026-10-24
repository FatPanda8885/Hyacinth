/**
 * Hyacinth 插件 SDK 客户端（大纲 4.4/4.5）
 *
 * 插件页面内使用：封装握手、RPC 请求/响应配对、主题变量下发。
 * 示例插件直接 import；M5 会连同类型定义独立发布 npm 包。
 */
import { PROTOCOL_VERSION, type HostToPlugin } from './protocol'

type Pending = { resolve: (value: unknown) => void; reject: (reason: Error) => void }

export class HyacinthPlugin {
  /** 最近一次宿主下发的主题变量 */
  theme: Record<string, string> = {}

  /** 握手完成（收到 init）后 resolve */
  readonly ready: Promise<void>

  onThemeChange?: (variables: Record<string, string>) => void

  private seq = 0
  private pending = new Map<string, Pending>()
  private resolveReady: (() => void) | undefined

  constructor() {
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve
    })
    window.addEventListener('message', (event) => this.handle(event.data))
    this.post({ v: PROTOCOL_VERSION, type: 'hello', protocol: PROTOCOL_VERSION })
  }

  private handle(raw: unknown): void {
    const msg = raw as HostToPlugin
    if (typeof msg !== 'object' || msg === null || msg.v !== PROTOCOL_VERSION) return

    if (msg.type === 'init') {
      this.theme = msg.payload.theme ?? {}
      this.resolveReady?.()
      this.onThemeChange?.(this.theme)
      return
    }
    if (msg.type === 'theme') {
      this.theme = msg.payload ?? {}
      this.onThemeChange?.(this.theme)
      return
    }
    if (msg.type === 'rpc-result') {
      const pending = this.pending.get(msg.id)
      if (!pending) return
      this.pending.delete(msg.id)
      if (msg.ok) {
        pending.resolve(msg.result)
      } else {
        pending.reject(new Error(msg.error))
      }
    }
  }

  private post(message: unknown): void {
    parent.postMessage(message, '*')
  }

  private rpc<T>(method: string, params: unknown): Promise<T> {
    const id = `r${++this.seq}`
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
      this.post({ v: PROTOCOL_VERSION, type: 'rpc', id, method, params })
    })
  }

  // ---- 存储（插件独立命名空间） ----
  getStorage<T>(key: string): Promise<T | undefined> {
    return this.rpc<T>('storage.get', { key })
  }

  setStorage(key: string, value: unknown): Promise<void> {
    return this.rpc<void>('storage.set', { key, value })
  }

  removeStorage(key: string): Promise<void> {
    return this.rpc<void>('storage.remove', { key })
  }

  // ---- 主题 ----
  getTheme(): Promise<Record<string, string>> {
    return this.rpc<Record<string, string>>('theme.get', {})
  }

  /** 把主题变量写到本 iframe 的 documentElement，插件样式即可用 var(--hy-*) */
  applyTheme(variables: Record<string, string> = this.theme): void {
    for (const [key, value] of Object.entries(variables)) {
      document.documentElement.style.setProperty(key, value)
    }
  }

  // ---- 画布 ----
  /** 请求调整自身槽位尺寸（网格单位，宿主会按插件约束钳制） */
  resizeSlot(w: number, h: number): Promise<boolean> {
    return this.rpc<boolean>('layout.resize', { w, h })
  }

  openSettings(): Promise<void> {
    return this.rpc<void>('settings.open', {})
  }

  // ---- 网络（需 fetch:<host> 权限） ----
  fetch<T = { status: number; body: string }>(url: string): Promise<T> {
    return this.rpc<T>('fetch', { url })
  }
}
