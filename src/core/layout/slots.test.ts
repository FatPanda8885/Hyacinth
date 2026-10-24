import { describe, expect, it } from 'vitest'

import type { Slot } from '@/shared/types'

import { COLS, ROWS } from './grid'
import {
  bringToFront,
  findAddPosition,
  normalizeSlots,
  patchSlot,
  removeSlot,
  sendToBack,
  topZ,
} from './slots'

const mk = (id: string, z: number) => ({ id, widget: 'clock', x: 1, y: 1, w: 4, h: 3, z })

describe('slots/normalizeSlots', () => {
  it('过滤非法项并修整坐标', () => {
    const raw = [
      mk('a', 2),
      null,
      'x',
      { id: 'b', widget: 'search' }, // 缺坐标 → 0,0 / 4x3
      { id: 'c', widget: 'shortcuts', x: -5, y: 99, w: 0, h: 0, z: 1 },
      { widget: 'no-id' },
      { id: 'has space', widget: 'clock', x: 0, y: 0, w: 4, h: 3 },
    ]
    const out = normalizeSlots(raw)
    // b 缺 z 视为 0、c 为 1、a 为 2，排序后按 z 重编号
    expect(out.map((s) => s.id)).toEqual(['b', 'c', 'a'])
    expect(out.find((s) => s.id === 'c')).toMatchObject({
      x: 0,
      y: ROWS - 1,
      w: 1,
      h: 1,
    })
  })

  it('非数组输入返回空', () => {
    expect(normalizeSlots(undefined)).toEqual([])
    expect(normalizeSlots('x')).toEqual([])
  })

  it('按 z 排序并重编号为连续', () => {
    const out = normalizeSlots([mk('a', 5), mk('b', 5), mk('c', 1)])
    expect(out.map((s) => s.z)).toEqual([0, 1, 2])
    expect(out.map((s) => s.id)).toEqual(['c', 'a', 'b'])
  })
})

describe('slots/z-order', () => {
  const slots = [mk('a', 0), mk('b', 1), mk('c', 2)]

  it('topZ 返回最大层级', () => {
    expect(topZ(slots)).toBe(2)
    expect(topZ([])).toBe(-1)
  })

  it('bringToFront 置顶', () => {
    const out = bringToFront(slots, 'a')
    expect(out.find((s) => s.id === 'a')?.z).toBe(3)
  })

  it('sendToBack 沉底并顶开其他', () => {
    const out = sendToBack(slots, 'c')
    expect(out.find((s) => s.id === 'c')?.z).toBe(0)
    expect(out.find((s) => s.id === 'a')?.z).toBe(1)
    expect(out.find((s) => s.id === 'b')?.z).toBe(2)
  })

  it('removeSlot / patchSlot', () => {
    expect(removeSlot(slots, 'b').map((s) => s.id)).toEqual(['a', 'c'])
    expect(patchSlot(slots, 'b', { x: COLS - 1 }).find((s) => s.id === 'b')?.x).toBe(COLS - 1)
  })
})

describe('slots/findAddPosition', () => {
  it('落点始终在画布内', () => {
    for (let n = 0; n < 12; n++) {
      const p = findAddPosition(Array.from({ length: n }, (_, i) => mk(`s${i}`, i)))
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThan(COLS)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThan(ROWS)
    }
  })

  const DEFAULT_LAYOUT: Slot[] = [
    { id: 'clock', widget: 'clock', x: 8, y: 2, w: 8, h: 6, z: 0 },
    { id: 'search', widget: 'search', x: 7, y: 11, w: 10, h: 3, z: 1 },
    { id: 'shortcuts', widget: 'shortcuts', x: 5, y: 17, w: 14, h: 6, z: 2 },
  ]

  const overlaps = (p: { x: number; y: number }, w: number, h: number, slots: Slot[]) =>
    slots.some((s) => p.x < s.x + s.w && p.x + w > s.x && p.y < s.y + s.h && p.y + h > s.y)

  it('默认布局上添加挂件不再压住已有槽位（回归：倒计时曾落在搜索栏上）', () => {
    for (const [w, h] of [
      [4, 3],
      [7, 5],
    ]) {
      const p = findAddPosition(DEFAULT_LAYOUT, w, h)
      expect(overlaps(p, w, h, DEFAULT_LAYOUT)).toBe(false)
    }
  })

  it('放不下的大挂件取重叠面积最小的落点', () => {
    // 默认布局没有 9×4 的完整空位：落点重叠面积应为全网格最小（≤ 4 格）
    const p = findAddPosition(DEFAULT_LAYOUT, 9, 4)
    const area = DEFAULT_LAYOUT.reduce((sum, s) => {
      const ow = Math.min(p.x + 9, s.x + s.w) - Math.max(p.x, s.x)
      const oh = Math.min(p.y + 4, s.y + s.h) - Math.max(p.y, s.y)
      return sum + Math.max(0, ow) * Math.max(0, oh)
    }, 0)
    expect(area).toBeLessThanOrEqual(4)
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeGreaterThanOrEqual(0)
  })

  it('网格塞满时返回界内落点由用户手动整理', () => {
    const full = Array.from({ length: 6 }, (_, i) => mk(`f${i}`, i)).map((s, i) => ({
      ...s,
      x: (i % 6) * 4,
      y: 0,
      w: 4,
      h: 24,
    }))
    const p = findAddPosition(full, 4, 3)
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThan(COLS)
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeLessThan(ROWS)
  })
})
