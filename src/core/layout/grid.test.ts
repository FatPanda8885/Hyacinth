import { describe, expect, it } from 'vitest'

import { COLS, ROWS, clampSlot, moveSlot, pctStyle, resizeSlot, snapToCenters } from './grid'

describe('grid/clampSlot', () => {
  it('越界和非法值被修整进边界', () => {
    expect(clampSlot({ x: -3, y: -1, w: 5, h: 4 })).toEqual({ x: 0, y: 0, w: 5, h: 4 })
    expect(clampSlot({ x: 22, y: 23, w: 5, h: 4 })).toEqual({ x: 19, y: 20, w: 5, h: 4 })
    expect(clampSlot({ x: 0, y: 0, w: 99, h: 0 })).toEqual({ x: 0, y: 0, w: COLS, h: 1 })
  })

  it('小数取整', () => {
    expect(clampSlot({ x: 2.6, y: 3.4, w: 4.5, h: 2.5 })).toEqual({ x: 3, y: 3, w: 5, h: 3 })
  })
})

describe('grid/moveSlot', () => {
  it('按增量移动并 clamp', () => {
    expect(moveSlot({ x: 2, y: 2, w: 4, h: 3 }, 3, 5)).toEqual({ x: 5, y: 7, w: 4, h: 3 })
    expect(moveSlot({ x: 2, y: 2, w: 4, h: 3 }, -10, 0)).toEqual({ x: 0, y: 2, w: 4, h: 3 })
    expect(moveSlot({ x: 20, y: 20, w: 4, h: 3 }, 10, 10)).toEqual({ x: 20, y: 21, w: 4, h: 3 })
  })
})

describe('grid/resizeSlot', () => {
  const base = { x: 4, y: 4, w: 6, h: 4 }
  const min = { w: 3, h: 2 }

  it('东/南方向只改尺寸', () => {
    expect(resizeSlot(base, 'e', 2, 0, min)).toEqual({ ...base, w: 8 })
    expect(resizeSlot(base, 's', 0, 3, min)).toEqual({ ...base, h: 7 })
    expect(resizeSlot(base, 'se', 1, 1, min)).toEqual({ x: 4, y: 4, w: 7, h: 5 })
  })

  it('西/北方向移动起点并保持对边不动', () => {
    expect(resizeSlot(base, 'w', -2, 0, min)).toEqual({ x: 2, y: 4, w: 8, h: 4 })
    expect(resizeSlot(base, 'w', 5, 0, min)).toEqual({ x: 7, y: 4, w: 3, h: 4 })
    expect(resizeSlot(base, 'n', 0, -1, min)).toEqual({ x: 4, y: 3, w: 6, h: 5 })
  })

  it('尊重最小尺寸', () => {
    expect(resizeSlot(base, 'e', -10, 0, min).w).toBe(min.w)
    // 北手柄向下拖（dy 为正）压缩高度至最小值
    expect(resizeSlot(base, 'n', 0, 10, min)).toEqual({ x: 4, y: 6, w: 6, h: 2 })
  })

  it('不越出画布', () => {
    const edge = { x: 20, y: 21, w: 4, h: 3 }
    expect(
      resizeSlot(edge, 'e', 5, 0, min).x + resizeSlot(edge, 'e', 5, 0, min).w,
    ).toBeLessThanOrEqual(COLS)
    const neg = resizeSlot({ x: 0, y: 0, w: 6, h: 4 }, 'nw', -5, -5, min)
    expect(neg.x).toBe(0)
    expect(neg.y).toBe(0)
  })
})

describe('grid/snapToCenters', () => {
  it('接近中心时对齐并给出参考线', () => {
    // x 向中心对齐；y 中心远离画布中心，不触发
    const r = snapToCenters({ x: 8.1, y: 3, w: 8, h: 4 })
    expect(r.guideV).toBe(true)
    expect(r.slot.x).toBe((COLS - 8) / 2)
    expect(r.guideH).toBe(false)
  })

  it('远离中心不动', () => {
    const r = snapToCenters({ x: 1, y: 1, w: 4, h: 3 })
    expect(r.guideV).toBe(false)
    expect(r.guideH).toBe(false)
    expect(r.slot).toEqual({ x: 1, y: 1, w: 4, h: 3 })
  })

  it('横向中心对齐', () => {
    const r = snapToCenters({ x: 4, y: 10.3, w: 6, h: 3.4 })
    expect(r.guideH).toBe(true)
    expect(r.slot.y).toBeCloseTo((ROWS - r.slot.h) / 2, 5)
  })
})

describe('grid/pctStyle', () => {
  it('单位转百分比', () => {
    expect(pctStyle({ x: 6, y: 6, w: 12, h: 12 })).toEqual({
      left: '25%',
      top: '25%',
      width: '50%',
      height: '50%',
    })
  })
})
