/**
 * 插件宿主控制器（大纲 4.4）：管理与单个沙箱 iframe 的协议会话。
 * 框架无关 —— Vue 组件负责接线（iframe 生命周期、message 事件来源过滤），
 * 本类只做协议状态机：hello 握手 → init 下发 → rpc 校验分发。
 */
import {
  PROTOCOL_VERSION,
  type HostToPlugin,
  type RpcRequest,
  parsePluginMessage,
  rpcAllowed,
  rpcErr,
  rpcOk,
  isValidStorageKey,
} from '@/plugin-sdk/protocol'

/** 宿主为插件提供的服务（调用方负责按插件隔离命名空间） */
export interface HostServices {
  storageGet(key: string): Promise<unknown>
  storageSet(key: string, value: unknown): Promise<void>
  storageRemove(key: string): Promise<void>
  getTheme(): Record<string, string>
  resizeSlot(w: number, h: number): Promise<unknown>
  openSettings(): void
  proxyFetch(url: string): Promise<unknown>
}

export interface PluginHostOptions {
  pluginId: string
  permissions: string[]
  services: HostServices
  /** 发往插件的消息出口（Vue 侧绑定 iframe.contentWindow.postMessage） */
  post(message: HostToPlugin): void
  onError?(message: string): void
}

export class PluginHostController {
  private readonly opts: PluginHostOptions
  private greeted = false
  private disposed = false

  constructor(opts: PluginHostOptions) {
    this.opts = opts
  }

  /** 处理一条来自本插件 iframe 的 message（调用方先用 event.source 过滤归属） */
  onMessage(raw: unknown): void {
    if (this.disposed) return
    const msg = parsePluginMessage(raw)
    if (!msg) return

    if (msg.type === 'hello') {
      if (msg.protocol !== PROTOCOL_VERSION) {
        this.opts.onError?.(`插件 ${this.opts.pluginId} 协议版本不兼容（${msg.protocol}）`)
        return
      }
      this.greeted = true
      this.opts.post({
        v: PROTOCOL_VERSION,
        type: 'init',
        protocol: PROTOCOL_VERSION,
        payload: {
          permissions: [...this.opts.permissions],
          theme: this.opts.services.getTheme(),
        },
      })
      return
    }

    void this.dispatch(msg.id, msg.method, msg.params)
  }

  private async dispatch(
    id: string,
    method: RpcRequest['method'],
    rawParams: unknown,
  ): Promise<void> {
    const fail = (error: string) => this.opts.post(rpcErr(id, error))
    const req = this.buildRequest(method, rawParams)
    if (!req) return fail('参数不合法')

    if (!rpcAllowed(this.opts.permissions, req)) {
      return fail(`权限不足：${method} 未在插件权限清单中授权`)
    }

    try {
      const s = this.opts.services
      switch (req.method) {
        case 'storage.get':
          return this.opts.post(rpcOk(id, await s.storageGet(req.params.key)))
        case 'storage.set':
          await s.storageSet(req.params.key, req.params.value)
          return this.opts.post(rpcOk(id, true))
        case 'storage.remove':
          await s.storageRemove(req.params.key)
          return this.opts.post(rpcOk(id, true))
        case 'theme.get':
          return this.opts.post(rpcOk(id, s.getTheme()))
        case 'layout.resize':
          return this.opts.post(rpcOk(id, await s.resizeSlot(req.params.w, req.params.h)))
        case 'settings.open':
          s.openSettings()
          return this.opts.post(rpcOk(id, true))
        case 'fetch':
          return this.opts.post(rpcOk(id, await s.proxyFetch(req.params.url)))
      }
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err))
    }
  }

  /** 逐方法校验参数形状 */
  private buildRequest(method: RpcRequest['method'], params: unknown): RpcRequest | null {
    const p = (params ?? {}) as Record<string, unknown>
    switch (method) {
      case 'storage.get':
      case 'storage.remove':
        return isValidStorageKey(p.key) ? ({ method, params: { key: p.key } } as RpcRequest) : null
      case 'storage.set':
        return isValidStorageKey(p.key) && 'value' in p
          ? ({ method, params: { key: p.key, value: p.value } } as RpcRequest)
          : null
      case 'theme.get':
      case 'settings.open':
        return { method, params: {} } as RpcRequest
      case 'layout.resize': {
        const w = Number(p.w)
        const h = Number(p.h)
        return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0
          ? ({ method, params: { w, h } } as RpcRequest)
          : null
      }
      case 'fetch':
        return typeof p.url === 'string' && /^https?:\/\//.test(p.url)
          ? ({ method, params: { url: p.url } } as RpcRequest)
          : null
    }
  }

  /** 主题变化推送（握手前忽略——init 已带最新值） */
  pushTheme(variables: Record<string, string>): void {
    if (this.disposed || !this.greeted) return
    this.opts.post({ v: PROTOCOL_VERSION, type: 'theme', payload: variables })
  }

  destroy(): void {
    this.disposed = true
  }
}
