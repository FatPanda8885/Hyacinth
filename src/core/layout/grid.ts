/**
 * 画布虚拟网格（大纲 4.1）：
 * 整页划成 COLS×ROWS 个相对单位，挂件的 x/y/w/h 以网格单元存储。
 * 相对单位让布局在任何分辨率/窗口尺寸下按视口比例还原，天然跨设备。
 */

export const COLS = 24
export const ROWS = 24

export type GridSlot = {
  x: number
  y: number
  w: number
  h: number
}

export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export const HANDLES: Handle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

/** 把槽位修整进网格边界（含取整、最小 1×1） */
export function clampSlot(s: GridSlot): GridSlot {
  const w = Math.max(1, Math.min(COLS, Math.round(s.w)))
  const h = Math.max(1, Math.min(ROWS, Math.round(s.h)))
  return {
    w,
    h,
    x: Math.max(0, Math.min(COLS - w, Math.round(s.x))),
    y: Math.max(0, Math.min(ROWS - h, Math.round(s.y))),
  }
}

export function moveSlot(base: GridSlot, dx: number, dy: number): GridSlot {
  return clampSlot({ ...base, x: base.x + dx, y: base.y + dy })
}

/**
 * 按手柄方向缩放：dx/dy 为网格单位增量；西/北方向会移动 x/y 并受最小尺寸约束。
 */
export function resizeSlot(
  base: GridSlot,
  handle: Handle,
  dx: number,
  dy: number,
  min: Pick<GridSlot, 'w' | 'h'> = { w: 1, h: 1 },
): GridSlot {
  let { x, y, w, h } = base
  if (handle.includes('e')) w = Math.max(min.w, w + dx)
  if (handle.includes('s')) h = Math.max(min.h, h + dy)
  if (handle.includes('w')) {
    const maxX = base.x + base.w - min.w
    const nx = Math.max(0, Math.min(maxX, base.x + dx))
    w = base.x + base.w - nx
    x = nx
  }
  if (handle.includes('n')) {
    const maxY = base.y + base.h - min.h
    const ny = Math.max(0, Math.min(maxY, base.y + dy))
    h = base.y + base.h - ny
    y = ny
  }
  return clampSlot({ x, y, w, h })
}

export const CENTER_SNAP_THRESHOLD = 0.4

export interface SnapResult {
  slot: GridSlot
  guideV: boolean
  guideH: boolean
}

/** 画布中心线吸附：槽位中心距画布中心小于阈值时对齐并显示参考线 */
export function snapToCenters(s: GridSlot, threshold = CENTER_SNAP_THRESHOLD): SnapResult {
  const slot = { ...s }
  let guideV = false
  let guideH = false
  const cx = s.x + s.w / 2
  if (Math.abs(cx - COLS / 2) <= threshold) {
    slot.x = (COLS - s.w) / 2
    guideV = true
  }
  const cy = s.y + s.h / 2
  if (Math.abs(cy - ROWS / 2) <= threshold) {
    slot.y = (ROWS - s.h) / 2
    guideH = true
  }
  return { slot, guideV, guideH }
}

/** 网格单位 → 百分比定位样式（挂件容器的 left/top/width/height） */
export function pctStyle(s: GridSlot): {
  left: string
  top: string
  width: string
  height: string
} {
  return {
    left: `${(s.x / COLS) * 100}%`,
    top: `${(s.y / ROWS) * 100}%`,
    width: `${(s.w / COLS) * 100}%`,
    height: `${(s.h / ROWS) * 100}%`,
  }
}
