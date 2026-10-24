/** 槽位集合操作：z 层级、归一化、增删（大纲 4.1 层级管理） */

import type { Slot } from '@/shared/types'

import { clampSlot, COLS, type GridSlot, ROWS } from './grid'

/** 清洗持久化数据：过滤非法项、按 z 排序后重编号为连续整数 */
export function normalizeSlots(raw: unknown): Slot[] {
  if (!Array.isArray(raw)) return []
  const out: Slot[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const s = item as Partial<Slot>
    if (typeof s.id !== 'string' || typeof s.widget !== 'string') continue
    if (/\s/.test(s.id)) continue
    const g = clampSlot({
      x: typeof s.x === 'number' ? s.x : 0,
      y: typeof s.y === 'number' ? s.y : 0,
      w: typeof s.w === 'number' ? s.w : 4,
      h: typeof s.h === 'number' ? s.h : 3,
    })
    out.push({
      id: s.id,
      widget: s.widget,
      ...g,
      z: typeof s.z === 'number' ? s.z : 0,
    })
  }
  return out.sort((a, b) => a.z - b.z || a.id.localeCompare(b.id)).map((s, i) => ({ ...s, z: i }))
}

export function topZ(slots: Slot[]): number {
  return slots.reduce((m, s) => Math.max(m, s.z), -1)
}

export function bringToFront(slots: Slot[], id: string): Slot[] {
  const next = topZ(slots) + 1
  return slots.map((s) => (s.id === id ? { ...s, z: next } : s))
}

export function sendToBack(slots: Slot[], id: string): Slot[] {
  return slots.map((s) => (s.id === id ? { ...s, z: 0 } : { ...s, z: s.z + 1 }))
}

export function removeSlot(slots: Slot[], id: string): Slot[] {
  return slots.filter((s) => s.id !== id)
}

export function patchSlot(slots: Slot[], id: string, patch: Partial<Slot>): Slot[] {
  return slots.map((s) => (s.id === id ? { ...s, ...patch } : s))
}

/**
 * 新挂件的落点：行优先扫描，优先返回第一个放得下 w×h 且零重叠的格位；
 * 大挂件找不到完整空位时退而求其次，返回重叠面积最小的位置。
 */
export function findAddPosition(slots: Slot[], w = 4, h = 3): Pick<GridSlot, 'x' | 'y'> {
  const size = clampSlot({ x: 0, y: 0, w, h })
  const overlapArea = (x: number, y: number) =>
    slots.reduce((sum, s) => {
      const ow = Math.min(x + size.w, s.x + s.w) - Math.max(x, s.x)
      const oh = Math.min(y + size.h, s.y + s.h) - Math.max(y, s.y)
      return sum + Math.max(0, ow) * Math.max(0, oh)
    }, 0)
  let best: { x: number; y: number; area: number } = { x: 1, y: 1, area: Infinity }
  for (let y = 0; y + size.h <= ROWS; y++) {
    for (let x = 0; x + size.w <= COLS; x++) {
      const area = overlapArea(x, y)
      if (area === 0) return { x, y }
      if (area < best.area) best = { x, y, area }
    }
  }
  return { x: best.x, y: best.y }
}
