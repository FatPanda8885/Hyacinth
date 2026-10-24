import { describe, expect, it } from 'vitest'

import {
  fetchAllowed,
  isValidStorageKey,
  parseFetchPermission,
  parsePluginMessage,
  rpcAllowed,
} from './protocol'

describe('fetch 权限', () => {
  it('精确域名匹配', () => {
    expect(fetchAllowed(['fetch:api.example.com'], 'https://api.example.com/x')).toBe(true)
    expect(
      fetchAllowed(['fetch:api.example.com'], 'https://evil.com/https://api.example.com'),
    ).toBe(false)
    expect(fetchAllowed(['fetch:api.example.com'], 'https://other.com')).toBe(false)
    expect(fetchAllowed(['fetch:api.example.com'], 'https://sub.api.example.com')).toBe(false)
  })

  it('通配符覆盖子域与主域（对齐 Chrome match pattern 语义）', () => {
    expect(fetchAllowed(['fetch:*.example.com'], 'https://a.example.com/x')).toBe(true)
    expect(fetchAllowed(['fetch:*.example.com'], 'https://a.b.example.com/x')).toBe(true)
    expect(fetchAllowed(['fetch:*.example.com'], 'https://example.com/x')).toBe(true)
    expect(fetchAllowed(['fetch:*.example.com'], 'https://notexample.com/')).toBe(false)
  })

  it('仅允许 http/https', () => {
    expect(fetchAllowed(['fetch:a.com'], 'file:///etc/passwd')).toBe(false)
    expect(fetchAllowed(['fetch:a.com'], 'chrome-extension://x/y')).toBe(false)
    expect(fetchAllowed(['fetch:a.com'], 'not a url')).toBe(false)
  })

  it('非法权限项被忽略', () => {
    expect(fetchAllowed(['fetch:', 'fetch:..', 'storage', 'fetch:*.*'], 'https://a.com/')).toBe(
      false,
    )
    expect(parseFetchPermission('storage')).toBeNull()
    expect(parseFetchPermission('fetch:localhost')).toBeNull() // 无点号
  })

  it('大小写不敏感', () => {
    expect(fetchAllowed(['fetch:API.Example.com'], 'https://api.example.COM/x')).toBe(true)
  })
})

describe('rpcAllowed', () => {
  const all = ['storage', 'theme', 'layout', 'settings', 'fetch:api.test']

  it('各方法对应基础权限', () => {
    expect(rpcAllowed(all, { method: 'storage.get', params: { key: 'a' } })).toBe(true)
    expect(rpcAllowed(['theme'], { method: 'storage.get', params: { key: 'a' } })).toBe(false)
    expect(rpcAllowed(all, { method: 'theme.get', params: {} })).toBe(true)
    expect(rpcAllowed(all, { method: 'layout.resize', params: { w: 4, h: 3 } })).toBe(true)
    expect(rpcAllowed(all, { method: 'settings.open', params: {} })).toBe(true)
    expect(rpcAllowed(['theme'], { method: 'settings.open', params: {} })).toBe(false)
  })

  it('fetch 必须命中白名单域名', () => {
    expect(rpcAllowed(all, { method: 'fetch', params: { url: 'https://api.test/x' } })).toBe(true)
    expect(rpcAllowed(all, { method: 'fetch', params: { url: 'https://other.test/x' } })).toBe(
      false,
    )
    expect(
      rpcAllowed(['storage'], { method: 'fetch', params: { url: 'https://api.test/x' } }),
    ).toBe(false)
  })
})

describe('存储键校验', () => {
  it('接受窄字符集', () => {
    expect(isValidStorageKey('target-date')).toBe(true)
    expect(isValidStorageKey('a.b_c-1')).toBe(true)
  })

  it('拒绝越界形态', () => {
    expect(isValidStorageKey('')).toBe(false)
    expect(isValidStorageKey('a b')).toBe(false)
    expect(isValidStorageKey('a/b')).toBe(false)
    expect(isValidStorageKey('x'.repeat(65))).toBe(false)
    expect(isValidStorageKey(123)).toBe(false)
  })
})

describe('parsePluginMessage', () => {
  it('hello 与合法 rpc 通过', () => {
    expect(parsePluginMessage({ v: 1, type: 'hello', protocol: 1 })).toEqual({
      v: 1,
      type: 'hello',
      protocol: 1,
    })
    const rpc = parsePluginMessage({ v: 1, type: 'rpc', id: 'r1', method: 'theme.get', params: {} })
    expect(rpc).toMatchObject({ type: 'rpc', id: 'r1', method: 'theme.get' })
  })

  it('拒绝未知版本/未知方法/坏形状', () => {
    expect(parsePluginMessage({ v: 2, type: 'hello', protocol: 1 })).toBeNull()
    expect(
      parsePluginMessage({ v: 1, type: 'rpc', id: 'r', method: 'evil.run', params: {} }),
    ).toBeNull()
    expect(parsePluginMessage('hello')).toBeNull()
    expect(parsePluginMessage(null)).toBeNull()
  })
})
