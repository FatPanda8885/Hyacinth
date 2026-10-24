import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import type { HostToPlugin } from '@/plugin-sdk/protocol'

import { PluginHostController, type HostServices } from './host'

function setup(permissions: string[], services: Partial<HostServices> = {}) {
  const sent: HostToPlugin[] = []
  const onError = vi.fn()
  const svc: HostServices = {
    storageGet: vi.fn(async () => 'stored'),
    storageSet: vi.fn(async () => undefined),
    storageRemove: vi.fn(async () => undefined),
    getTheme: vi.fn(() => ({ '--hy-accent': '#8b7cf8' })),
    resizeSlot: vi.fn(async () => true),
    openSettings: vi.fn(),
    proxyFetch: vi.fn(async () => ({ status: 200, body: '{}' })),
    ...services,
  }
  const host = new PluginHostController({
    pluginId: 'test-plugin',
    permissions,
    services: svc,
    post: (m) => sent.push(m),
    onError,
  })
  return { host, sent, svc, onError }
}

describe('PluginHostController', () => {
  it('hello 握手后下发 init（权限 + 主题）', () => {
    const { host, sent } = setup(['storage', 'theme'])
    host.onMessage({ v: 1, type: 'hello', protocol: 1 })
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      type: 'init',
      payload: { permissions: ['storage', 'theme'], theme: { '--hy-accent': '#8b7cf8' } },
    })
  })

  it('拒绝不兼容协议版本', () => {
    const { host, sent, onError } = setup(['storage'])
    host.onMessage({ v: 1, type: 'hello', protocol: 99 })
    expect(sent).toHaveLength(0)
    expect(onError).toHaveBeenCalled()
  })

  it('rpc 走权限检查：未授权方法返回错误', async () => {
    const { host, sent } = setup(['theme']) // 无 storage
    host.onMessage({ v: 1, type: 'hello', protocol: 1 })
    host.onMessage({ v: 1, type: 'rpc', id: 'r1', method: 'storage.get', params: { key: 'a' } })
    await new Promise((r) => setTimeout(r))
    const reply = sent.find((m) => m.type === 'rpc-result')
    expect(reply).toMatchObject({ type: 'rpc-result', id: 'r1', ok: false })
  })

  it('storage.get 授权后返回服务结果', async () => {
    const { host, sent, svc } = setup(['storage'])
    host.onMessage({ v: 1, type: 'hello', protocol: 1 })
    host.onMessage({ v: 1, type: 'rpc', id: 'r2', method: 'storage.get', params: { key: 'k-1' } })
    await vi.waitFor(() => expect(sent.some((m) => m.type === 'rpc-result')).toBe(true))
    expect(svc.storageGet).toHaveBeenCalledWith('k-1')
    expect(sent.find((m) => m.type === 'rpc-result')).toMatchObject({
      id: 'r2',
      ok: true,
      result: 'stored',
    })
  })

  it('fetch 命中白名单才放行', async () => {
    const { host, sent } = setup(['fetch:api.ok.test'])
    host.onMessage({ v: 1, type: 'hello', protocol: 1 })
    host.onMessage({
      v: 1,
      type: 'rpc',
      id: 'f1',
      method: 'fetch',
      params: { url: 'https://api.ok.test/x' },
    })
    host.onMessage({
      v: 1,
      type: 'rpc',
      id: 'f2',
      method: 'fetch',
      params: { url: 'https://evil.test/x' },
    })
    await vi.waitFor(() => expect(sent.filter((m) => m.type === 'rpc-result')).toHaveLength(2))
    // 响应完成顺序不定，按 id 断言
    const byId = (id: string) => sent.find((m) => m.type === 'rpc-result' && m.id === id)
    expect(byId('f1')).toMatchObject({ id: 'f1', ok: true })
    expect(byId('f2')).toMatchObject({ id: 'f2', ok: false })
  })

  it('非法参数（坏 key / 非数字尺寸）返回错误', async () => {
    const { host, sent } = setup(['storage', 'layout'])
    host.onMessage({ v: 1, type: 'hello', protocol: 1 })
    host.onMessage({ v: 1, type: 'rpc', id: 'b1', method: 'storage.set', params: { key: 'a b' } })
    host.onMessage({
      v: 1,
      type: 'rpc',
      id: 'b2',
      method: 'layout.resize',
      params: { w: 'x', h: 2 },
    })
    await vi.waitFor(() => expect(sent.filter((m) => m.type === 'rpc-result')).toHaveLength(2))
    for (const r of sent.filter((m) => m.type === 'rpc-result')) {
      expect(r).toMatchObject({ ok: false })
    }
  })

  it('storage.get 返回响应式 Proxy 时回包可被 structuredClone', async () => {
    // 复刻真实故障：插件存储从 Pinia 响应式 store 读出，直接 postMessage 会 DataCloneError
    const proxied = reactive({ text: '你好', from: '测试' })
    const { host, sent } = setup(['storage'], { storageGet: async () => proxied })
    host.onMessage({ v: 1, type: 'hello', protocol: 1 })
    host.onMessage({ v: 1, type: 'rpc', id: 'px1', method: 'storage.get', params: { key: 'last' } })
    await vi.waitFor(() => expect(sent.some((m) => m.type === 'rpc-result')).toBe(true))
    const reply = sent.find((m) => m.type === 'rpc-result')!
    expect(() => structuredClone(reply)).not.toThrow()
    expect(reply).toMatchObject({ ok: true, result: { text: '你好', from: '测试' } })
  })

  it('pushTheme 仅在握手后生效', () => {
    const { host, sent } = setup(['theme'])
    host.pushTheme({ '--hy-bg': '#000' })
    expect(sent).toHaveLength(0)
    host.onMessage({ v: 1, type: 'hello', protocol: 1 })
    host.pushTheme({ '--hy-bg': '#000' })
    expect(sent.filter((m) => m.type === 'theme')).toHaveLength(1)
  })

  it('destroy 后忽略一切消息', () => {
    const { host, sent } = setup(['storage'])
    host.destroy()
    host.onMessage({ v: 1, type: 'hello', protocol: 1 })
    expect(sent).toHaveLength(0)
  })

  it('服务抛错转为 rpc 错误而不是炸掉宿主', async () => {
    const sent: HostToPlugin[] = []
    const failing = new PluginHostController({
      pluginId: 'p',
      permissions: ['fetch:api.ok.test'],
      services: {
        storageGet: async () => undefined,
        storageSet: async () => undefined,
        storageRemove: async () => undefined,
        getTheme: () => ({}),
        resizeSlot: async () => true,
        openSettings: () => {},
        proxyFetch: async () => {
          throw new Error('network down')
        },
      },
      post: (m) => sent.push(m),
    })
    failing.onMessage({ v: 1, type: 'hello', protocol: 1 })
    failing.onMessage({
      v: 1,
      type: 'rpc',
      id: 'e1',
      method: 'fetch',
      params: { url: 'https://api.ok.test' },
    })
    await vi.waitFor(() => expect(sent.some((m) => m.type === 'rpc-result')).toBe(true))
    expect(sent.find((m) => m.type === 'rpc-result')).toMatchObject({
      ok: false,
      error: 'network down',
    })
  })
})
