/** 快捷方式挂件：链接模型与纯逻辑 */

export type ShortcutLink = {
  id: string
  title: string
  url: string
}

export type ShortcutsConfig = {
  links: ShortcutLink[]
}

export const SHORTCUTS_DEFAULTS: ShortcutsConfig = {
  links: [
    { id: 'seed-github', title: 'GitHub', url: 'https://github.com' },
    { id: 'seed-bilibili', title: 'Bilibili', url: 'https://www.bilibili.com' },
    { id: 'seed-zhihu', title: '知乎', url: 'https://www.zhihu.com' },
    { id: 'seed-mdn', title: 'MDN', url: 'https://developer.mozilla.org' },
  ],
}

export function newId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
}

/** 用户输入补全协议：无协议时默认 https:// */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/** 磁贴上显示的字母：标题首字符 > 域名首字符 > # */
export function tileLabel(link: ShortcutLink): string {
  const title = link.title.trim()
  if (title) return [...title][0].toUpperCase()
  const host = hostOf(link.url).replace(/^www\./, '')
  const first = [...host][0]
  return first ? first.toUpperCase() : '#'
}

/** 由字符串确定性地生成色相（0-359），同一站点颜色稳定 */
export function hueOf(seed: string): number {
  let hash = 2166136261
  for (const ch of seed) {
    hash ^= ch.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash) % 360
}

export function tileColor(link: ShortcutLink): string {
  const h = hueOf(hostOf(link.url) || link.url || link.title)
  return `hsl(${h}, 42%, 38%)`
}
