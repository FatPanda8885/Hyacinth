import type { ThemeBackground, ThemeConfig, ThemeDefinition } from '@/shared/types'
import { BACKGROUND_DEFAULTS, backgroundStyleFor } from '@/widgets/background'

import { BUILTIN_THEMES } from './builtin'

/** 主题变量键的合法形态：--hy-xxx */
const VAR_KEY_RE = /^--hy-[a-z0-9-]{1,48}$/

/** 过滤掉非法键值，防止持久化数据/导入文件注入任意样式 */
export function sanitizeVariables(raw: unknown): Record<string, string> {
  if (typeof raw !== 'object' || raw === null) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (VAR_KEY_RE.test(key) && typeof value === 'string' && value.length <= 512) {
      out[key] = value
    }
  }
  return out
}

export interface ResolvedTheme {
  /** 主题定义变量 + 用户覆盖合并后的最终变量集 */
  variables: Record<string, string>
  background: ThemeBackground
}

/** 主题定义 → 生效配置：用户覆盖叠加在主题之上，背景取 用户覆盖 > 主题 > 默认 */
export function resolveTheme(
  theme: ThemeDefinition | undefined,
  userVariables: Record<string, string>,
  userBackground?: ThemeBackground,
): ResolvedTheme {
  return {
    variables: { ...sanitizeVariables(theme?.variables), ...sanitizeVariables(userVariables) },
    background: userBackground ?? theme?.background ?? BACKGROUND_DEFAULTS,
  }
}

/** 按 id 找主题：内置 → 自定义 → 兜底第一个内置（配置指向已删除主题时不至于失联） */
export function findTheme(id: string, customThemes: ThemeDefinition[]): ThemeDefinition {
  return (
    BUILTIN_THEMES.find((t) => t.id === id) ??
    customThemes.find((t) => t.id === id) ??
    BUILTIN_THEMES[0]
  )
}

export type ThemeValidation = { ok: true; theme: ThemeDefinition } | { ok: false; error: string }

/** 校验导入的主题 JSON（大纲 4.3 导入导出），未知字段忽略以兼容后续版本 */
export function validateTheme(raw: unknown): ThemeValidation {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: '主题文件应为 JSON 对象' }
  const data = raw as Record<string, unknown>
  if (typeof data.id !== 'string' || !/^[a-z0-9-]{1,48}$/.test(data.id)) {
    return { ok: false, error: '主题 id 不合法（小写字母/数字/连字符，≤48 字符）' }
  }
  if (BUILTIN_THEMES.some((t) => t.id === data.id)) {
    return { ok: false, error: `主题 id "${data.id}" 与内置主题冲突` }
  }
  const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : data.id
  if (name.length > 32) return { ok: false, error: '主题名称过长（≤32 字符）' }

  const variables = sanitizeVariables(data.variables)
  if (Object.keys(variables).length === 0 && !data.background) {
    return { ok: false, error: '主题至少需要一组变量或一个背景' }
  }

  let background: ThemeBackground | undefined
  if (data.background !== undefined) {
    const bg = data.background
    if (
      typeof bg !== 'object' ||
      bg === null ||
      ((bg as ThemeBackground).type !== ('gradient' as const) &&
        (bg as ThemeBackground).type !== ('color' as const) &&
        (bg as ThemeBackground).type !== ('image' as const)) ||
      typeof (bg as ThemeBackground).value !== 'string' ||
      (bg as ThemeBackground).value.length === 0 ||
      (bg as ThemeBackground).value.length > 2048
    ) {
      return { ok: false, error: '主题背景格式不正确' }
    }
    background = bg as ThemeBackground
  }

  return { ok: true, theme: { id: data.id, name, variables, background } }
}

/** 导出格式：带格式版本号，导入时按版本校验 */
export function exportTheme(
  theme: ThemeDefinition,
  userVariables: ThemeConfig['variables'],
): string {
  const payload = {
    hyacinthTheme: 1,
    id: theme.id,
    name: theme.name,
    variables: { ...sanitizeVariables(theme.variables), ...sanitizeVariables(userVariables) },
    ...(theme.background ? { background: theme.background } : {}),
  }
  return JSON.stringify(payload, null, 2)
}

// ---- DOM 应用 ----

const appliedKeys = new Set<string>()

/** 把变量集覆盖到 documentElement（先清掉上一轮，支持主题热切换） */
export function applyThemeToDocument(
  variables: Record<string, string>,
  doc: Document = document,
): void {
  const root = doc.documentElement
  for (const key of appliedKeys) {
    root.style.removeProperty(key)
  }
  appliedKeys.clear()
  for (const [key, value] of Object.entries(sanitizeVariables(variables))) {
    root.style.setProperty(key, value)
    appliedKeys.add(key)
  }
}

/** 主题背景 → 新标签页背景层的样式 */
export function themeBackgroundStyle(background: ThemeBackground): {
  background: string
  backgroundColor: string
} {
  return backgroundStyleFor(background)
}
