/** 槽位集合操作：z 层级、归一化、增删（大纲 4.1 层级管理） */

import type { Slot } from '@/shared/types'

import { clampSlot, type GridSlot } from './grid'

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

/** 新挂件的落点：从左上角起按已有数量阶梯排开，简单避开堆叠 */
export function findAddPosition(slots: Slot[]): Pick<GridSlot, 'x' | 'y'> {
  const step = slots.length % 4
  return { x: 2 + step * 2, y: 2 + step * 3 }
}
