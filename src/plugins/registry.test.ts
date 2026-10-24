import { describe, expect, it } from 'vitest'

import {
  isValidPermission,
  parseRegistry,
  parseRegistryEntry,
  RegistryError,
  toInstalled,
} from './registry'

const GOOD = {
  id: 'my-plugin',
  name: '我的插件',
  description: '介绍',
  version: '1.0.0',
  entryUrl: 'https://example.github.io/plugin/index.html',
  permissions: ['storage', 'fetch:api.example.com'],
}

describe('plugins/parseRegistryEntry', () => {
  it('合法条目通过并保留约束', () => {
    const e = parseRegistryEntry({
      ...GOOD,
      constraints: { minW: 3, minH: 2, defaultW: 6, defaultH: 4 },
    })
    expect(e).not.toBeNull()
    expect(e?.constraints).toEqual({ minW: 3, minH: 2, defaultW: 6, defaultH: 4 })
  })

  it('约束里 min 超过 default 时收敛为 default（防钳制矛盾）', () => {
    const e = parseRegistryEntry({
      ...GOOD,
      constraints: { minW: 9, minH: 2, defaultW: 6, defaultH: 4 },
    })
    expect(e?.constraints?.minW).toBe(6)
  })

  it('拒绝非法 id / 非 https 入口 / 坏版本号 / 非法权限', () => {
    expect(parseRegistryEntry({ ...GOOD, id: 'Bad_Id' })).toBeNull()
    expect(parseRegistryEntry({ ...GOOD, id: 'x'.repeat(65) })).toBeNull()
    expect(parseRegistryEntry({ ...GOOD, entryUrl: 'http://evil.example.com/a.html' })).toBeNull()
    expect(parseRegistryEntry({ ...GOOD, entryUrl: 'not-a-url' })).toBeNull()
    expect(parseRegistryEntry({ ...GOOD, version: 'latest' })).toBeNull()
    expect(parseRegistryEntry({ ...GOOD, permissions: ['storage', 'shell:rm'] })).toBeNull()
    expect(parseRegistryEntry({ ...GOOD, permissions: ['fetch:not a host'] })).toBeNull()
  })

  it('本机回环 http 放行（本地调试），其他 http 拒绝', () => {
    expect(parseRegistryEntry({ ...GOOD, entryUrl: 'http://127.0.0.1:8000/p.html' })).not.toBeNull()
    expect(parseRegistryEntry({ ...GOOD, entryUrl: 'http://localhost:8000/p.html' })).not.toBeNull()
  })
})

describe('plugins/parseRegistry', () => {
  it('v 不是 1 抛 RegistryError', () => {
    expect(() => parseRegistry({ v: 2, plugins: [] })).toThrow(RegistryError)
    expect(() => parseRegistry({ plugins: [] })).toThrow(RegistryError)
    expect(() => parseRegistry({ v: 1 })).toThrow(RegistryError)
  })

  it('坏条目丢弃、同 id 去重保留首个', () => {
    const reg = parseRegistry({
      v: 1,
      plugins: [
        GOOD,
        { ...GOOD, name: 'dup' },
        { ...GOOD, id: 'broken', entryUrl: 'javascript:alert(1)' },
        'garbage',
      ],
    })
    expect(reg.plugins).toHaveLength(1)
    expect(reg.plugins[0]?.name).toBe('我的插件')
  })
})

describe('plugins/isValidPermission', () => {
  it('基础权限与 fetch 域名', () => {
    expect(isValidPermission('storage')).toBe(true)
    expect(isValidPermission('layout')).toBe(true)
    expect(isValidPermission('fetch:a.com')).toBe(true)
    expect(isValidPermission('fetch:*.a.com')).toBe(true)
    expect(isValidPermission('fetch:')).toBe(false)
    expect(isValidPermission('admin')).toBe(false)
    expect(isValidPermission(42)).toBe(false)
  })
})

describe('plugins/toInstalled', () => {
  it('索引条目转安装记录，无约束时给兜底尺寸', () => {
    const entry = parseRegistryEntry(GOOD)!
    const installed = toInstalled(entry)
    expect(installed).toMatchObject({
      id: 'my-plugin',
      enabled: true,
      entryUrl: GOOD.entryUrl,
      permissions: ['storage', 'fetch:api.example.com'],
    })
    expect(installed.constraints).toEqual({ minW: 3, minH: 2, defaultW: 6, defaultH: 4 })
  })
})
