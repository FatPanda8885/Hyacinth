import { describe, expect, it } from 'vitest'

import type { ThemeDefinition } from '@/shared/types'

import { BUILTIN_THEMES } from './builtin'
import { findTheme, resolveTheme, sanitizeVariables, validateTheme } from './apply'

const night = BUILTIN_THEMES[0]

describe('sanitizeVariables', () => {
  it('保留合法 --hy-* 键，过滤非法键与非字符串值', () => {
    expect(
      sanitizeVariables({
        '--hy-bg': '#fff',
        '--hy-fg': '#111',
        background: 'red',
        '--hy': 'x',
        '--hy-x': 123,
        '--Hy-upper': 'x',
      }),
    ).toEqual({ '--hy-bg': '#fff', '--hy-fg': '#111' })
  })

  it('非对象输入返回空对象', () => {
    expect(sanitizeVariables(null)).toEqual({})
    expect(sanitizeVariables('x')).toEqual({})
  })
})

describe('resolveTheme', () => {
  it('用户覆盖叠加在主题变量之上', () => {
    const theme: ThemeDefinition = {
      id: 't',
      name: 'T',
      variables: { '--hy-bg': '#111', '--hy-fg': '#eee' },
    }
    const r = resolveTheme(theme, { '--hy-bg': '#222' })
    expect(r.variables).toEqual({ '--hy-bg': '#222', '--hy-fg': '#eee' })
  })

  it('背景优先级：用户覆盖 > 主题 > 默认', () => {
    const withBg: ThemeDefinition = {
      id: 't',
      name: 'T',
      variables: {},
      background: { type: 'color', value: '#123' },
    }
    expect(resolveTheme(withBg, {}).background).toEqual({ type: 'color', value: '#123' })
    expect(resolveTheme(withBg, {}, { type: 'color', value: '#456' }).background).toEqual({
      type: 'color',
      value: '#456',
    })
    expect(resolveTheme(undefined, {}).background).toEqual(night.background)
  })
})

describe('findTheme', () => {
  it('内置优先，其次自定义，兜底第一个内置', () => {
    const custom: ThemeDefinition[] = [{ id: 'my', name: 'My', variables: {} }]
    expect(findTheme('night', custom)?.id).toBe('night')
    expect(findTheme('my', custom)?.id).toBe('my')
    expect(findTheme('nonexistent', custom)).toBe(BUILTIN_THEMES[0])
  })
})

describe('validateTheme', () => {
  const valid = {
    id: 'my-theme',
    name: '我的主题',
    variables: { '--hy-bg': '#101014' },
    background: { type: 'color', value: '#0f0f12' },
  }

  it('合法主题通过并补全默认名', () => {
    const r = validateTheme(valid)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.theme.name).toBe('我的主题')
    const noName = validateTheme({ id: 'x', variables: { '--hy-bg': '#000' } })
    expect(noName.ok && noName.theme.name).toBe('x')
  })

  it('拒绝非法 id、内置 id 冲突、空主题', () => {
    expect(validateTheme({ ...valid, id: 'Bad Id' }).ok).toBe(false)
    expect(validateTheme({ ...valid, id: 'night' }).ok).toBe(false)
    expect(validateTheme({ id: 'x', variables: {} }).ok).toBe(false)
    expect(validateTheme(null).ok).toBe(false)
  })

  it('拒绝非法背景', () => {
    expect(validateTheme({ ...valid, background: { type: 'weird', value: '#fff' } }).ok).toBe(false)
    expect(validateTheme({ ...valid, background: { type: 'color', value: '' } }).ok).toBe(false)
  })

  it('主题文件拒绝本地资产引用（无法跨设备分发）', () => {
    const r = validateTheme({ ...valid, background: { type: 'image', value: 'asset:abc' } })
    expect(r.ok).toBe(false)
  })

  it('忽略未知字段（向前兼容）', () => {
    const r = validateTheme({ ...valid, futureField: { a: 1 } })
    expect(r.ok).toBe(true)
  })
})
