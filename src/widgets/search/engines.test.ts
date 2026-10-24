import { describe, expect, it } from 'vitest'

import { SEARCH_DEFAULTS, SEARCH_ENGINES, getSearchEngine } from './engines'

describe('search engines', () => {
  it('构建的 URL 对空格与中文做了编码', () => {
    for (const engine of SEARCH_ENGINES) {
      const url = engine.buildUrl('hello 世界 a&b')
      expect(url).toContain(encodeURIComponent('hello 世界 a&b'))
      expect(() => new URL(url)).not.toThrow()
    }
  })

  it('每个引擎的 id 唯一', () => {
    const ids = SEARCH_ENGINES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('未知 id 退回默认引擎', () => {
    expect(getSearchEngine('nonexistent').id).toBe(SEARCH_ENGINES[0].id)
  })

  it('默认配置指向存在的引擎', () => {
    expect(SEARCH_ENGINES.some((e) => e.id === SEARCH_DEFAULTS.engine)).toBe(true)
  })
})
