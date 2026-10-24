import { describe, expect, it } from 'vitest'

import type { InstalledPlugin } from '@/shared/types'

import { resolvePluginEntry } from './catalog'

describe('plugins/resolvePluginEntry', () => {
  it('远程安装记录合成条目（entry 为完整 URL）', () => {
    const installed: InstalledPlugin = {
      id: 'note',
      name: '随手记',
      version: '0.1.0',
      enabled: true,
      permissions: ['storage', 'theme'],
      entryUrl: 'https://example.github.io/note/index.html',
      constraints: { minW: 3, minH: 2, defaultW: 5, defaultH: 4 },
    }
    const e = resolvePluginEntry('note', installed)
    expect(e?.entry).toBe(installed.entryUrl)
    expect(e?.constraints.defaultW).toBe(5)
  })

  it('无 entryUrl 时回退内置目录（countdown/hitokoto）', () => {
    const installed: InstalledPlugin = {
      id: 'countdown',
      name: '倒计时',
      version: '0.1.0',
      enabled: true,
      permissions: ['storage'],
    }
    const e = resolvePluginEntry('countdown', installed)
    expect(e?.entry).toBe('src/plugins/countdown/index.html')
  })

  it('未知 id 且无安装记录返回 undefined', () => {
    expect(resolvePluginEntry('ghost', undefined)).toBeUndefined()
  })

  it('远程记录缺约束时用兜底尺寸', () => {
    const installed: InstalledPlugin = {
      id: 'bare',
      name: '裸插件',
      version: '0.0.1',
      enabled: true,
      permissions: [],
      entryUrl: 'https://a.example.com/p.html',
    }
    expect(resolvePluginEntry('bare', installed)?.constraints).toEqual({
      minW: 3,
      minH: 2,
      defaultW: 6,
      defaultH: 4,
    })
  })
})
