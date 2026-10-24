/** 时钟挂件：配置类型与纯逻辑（便于单测） */

export type ClockConfig = {
  mode: 'digital' | 'analog'
  hour24: boolean
  showSeconds: boolean
  showDate: boolean
}

export const CLOCK_DEFAULTS: ClockConfig = {
  mode: 'digital',
  hour24: true,
  showSeconds: true,
  showDate: true,
}

export interface TimeParts {
  h: number
  m: number
  s: number
}

export function splitTime(date: Date): TimeParts {
  return { h: date.getHours(), m: date.getMinutes(), s: date.getSeconds() }
}

export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 12 小时制的显示值与 AM/PM 后缀 */
export function to12h(h: number): { h: number; suffix: 'AM' | 'PM' } {
  const suffix = h >= 12 ? 'PM' : 'AM'
  return { h: h % 12 || 12, suffix }
}

/** 模拟时钟三根指针的角度（deg，12 点方向为 0） */
export function handAngles({ h, m, s }: TimeParts): {
  hour: number
  minute: number
  second: number
} {
  return {
    hour: (h % 12) * 30 + m * 0.5,
    minute: m * 6 + s * 0.1,
    second: s * 6,
  }
}

/** 中文完整日期，如「2026年10月24日星期六」 */
export function formatDateZh(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'full' }).format(date)
}
