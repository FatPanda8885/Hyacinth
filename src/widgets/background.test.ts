import { describe, expect, it } from 'vitest'

import {
  BACKGROUND_DEFAULTS,
  PRESET_COLORS,
  PRESET_GRADIENTS,
  backgroundStyleFor,
} from './background'

describe('background', () => {
  it('渐变/纯色直接作为 background 值', () => {
    expect(backgroundStyleFor({ type: 'color', value: '#123456' })).toEqual({
      background: '#123456',
      backgroundColor: 'transparent',
    })
    const grad = backgroundStyleFor({ type: 'gradient', value: PRESET_GRADIENTS[0].value })
    expect(grad.background).toContain('linear-gradient')
  })

  it('图片类型生成 cover 样式并带底色兜底', () => {
    const style = backgroundStyleFor({ type: 'image', value: 'https://example.com/a.jpg' })
    expect(style.background).toContain('url("https://example.com/a.jpg")')
    expect(style.background).toContain('cover')
    expect(style.backgroundColor).toBe('#101014')
  })

  it('非法配置退回默认值', () => {
    expect(backgroundStyleFor(null).background).toBe(BACKGROUND_DEFAULTS.value)
    expect(backgroundStyleFor(undefined).background).toBe(BACKGROUND_DEFAULTS.value)
    expect(backgroundStyleFor('nonsense').background).toBe(BACKGROUND_DEFAULTS.value)
    expect(backgroundStyleFor({ type: 'color', value: '' }).background).toBe(
      BACKGROUND_DEFAULTS.value,
    )
    expect(backgroundStyleFor({ type: 'weird', value: '#fff' }).background).toBe(
      BACKGROUND_DEFAULTS.value,
    )
  })

  it('预设的 id 唯一', () => {
    const ids = [...PRESET_GRADIENTS, ...PRESET_COLORS].map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
