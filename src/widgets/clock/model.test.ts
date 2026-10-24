import { describe, expect, it } from 'vitest'

import { formatDateZh, handAngles, pad, splitTime, to12h } from './model'

describe('clock', () => {
  it('splitTime 拆出时分秒', () => {
    expect(splitTime(new Date(2026, 9, 24, 13, 5, 9))).toEqual({ h: 13, m: 5, s: 9 })
  })

  it('pad 补零到两位', () => {
    expect(pad(0)).toBe('00')
    expect(pad(9)).toBe('09')
    expect(pad(23)).toBe('23')
  })

  it('to12h 正确换算上下午', () => {
    expect(to12h(0)).toEqual({ h: 12, suffix: 'AM' })
    expect(to12h(9)).toEqual({ h: 9, suffix: 'AM' })
    expect(to12h(12)).toEqual({ h: 12, suffix: 'PM' })
    expect(to12h(23)).toEqual({ h: 11, suffix: 'PM' })
  })

  it('handAngles 指针角度含进位', () => {
    // 3:30:15 → 时针 3*30 + 30*0.5 = 105；分针 30*6 + 15*0.1 = 181.5；秒针 90
    expect(handAngles({ h: 3, m: 30, s: 15 })).toEqual({
      hour: 105,
      minute: 181.5,
      second: 90,
    })
    expect(handAngles({ h: 12, m: 0, s: 0 })).toEqual({ hour: 0, minute: 0, second: 0 })
  })

  it('formatDateZh 输出中文完整日期', () => {
    const text = formatDateZh(new Date(2026, 9, 24))
    expect(text).toContain('2026')
    expect(text).toContain('10月')
    expect(text).toContain('24日')
  })
})
