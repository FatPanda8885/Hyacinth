import { describe, expect, it } from 'vitest'

import { hostOf, hueOf, moveItem, normalizeUrl, tileColor, tileLabel } from './model'

describe('moveItem（排序）', () => {
  it('向后移动', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('向前移动', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('相同下标与越界原样返回', () => {
    const list = ['a', 'b']
    expect(moveItem(list, 1, 1)).toBe(list)
    expect(moveItem(list, -1, 0)).toBe(list)
    expect(moveItem(list, 0, 5)).toBe(list)
    expect(moveItem(list, 5, 0)).toBe(list)
  })

  it('不改动原数组', () => {
    const list = ['a', 'b', 'c']
    moveItem(list, 0, 2)
    expect(list).toEqual(['a', 'b', 'c'])
  })
})

describe('shortcuts', () => {
  it('normalizeUrl 给裸域名补 https 协议', () => {
    expect(normalizeUrl('github.com')).toBe('https://github.com')
    expect(normalizeUrl('  example.com/x  ')).toBe('https://example.com/x')
  })

  it('normalizeUrl 保留已有协议', () => {
    expect(normalizeUrl('http://a.com')).toBe('http://a.com')
    expect(normalizeUrl('https://a.com')).toBe('https://a.com')
  })

  it('normalizeUrl 空输入返回空串', () => {
    expect(normalizeUrl('   ')).toBe('')
  })

  it('hostOf 解析域名，非法输入返回空串', () => {
    expect(hostOf('https://www.baidu.com/s?wd=x')).toBe('www.baidu.com')
    expect(hostOf('not a url')).toBe('')
  })

  it('tileLabel 标题优先，其次域名，兜底 #', () => {
    expect(tileLabel({ id: '1', title: 'GitHub', url: 'https://github.com' })).toBe('G')
    expect(tileLabel({ id: '2', title: '知乎', url: 'https://zhihu.com' })).toBe('知')
    expect(tileLabel({ id: '3', title: '', url: 'https://www.bilibili.com' })).toBe('B')
    expect(tileLabel({ id: '4', title: '', url: '::invalid::' })).toBe('#')
  })

  it('hueOf 确定性且落在 0-359', () => {
    expect(hueOf('github.com')).toBe(hueOf('github.com'))
    expect(hueOf('a.com')).not.toBe(hueOf('b.com'))
    for (const s of ['x', 'y', 'z', 'github.com', 'bilibili.com']) {
      expect(hueOf(s)).toBeGreaterThanOrEqual(0)
      expect(hueOf(s)).toBeLessThan(360)
    }
  })

  it('tileColor 输出合法 hsl', () => {
    expect(tileColor({ id: '1', title: 'A', url: 'https://a.com' })).toMatch(
      /^hsl\(\d+, 42%, 38%\)$/,
    )
  })
})
