import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useConfigStore } from './config'

// node 环境：防抖保存的 setTimeout 用假定时器拦住，不触碰 localStorage
beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
})

describe('stores/config/uninstallPlugin', () => {
  it('卸载同时移除安装记录、画布槽位与存储命名空间', () => {
    const store = useConfigStore()
    store.config.plugins = [
      {
        id: 'note',
        name: '随手记',
        version: '0.1.0',
        enabled: true,
        permissions: ['storage'],
        entryUrl: 'https://a.example.com/p.html',
      },
    ]
    store.config.slots = [
      { id: 's1', widget: 'clock', x: 0, y: 0, w: 4, h: 3, z: 0 },
      { id: 's2', widget: 'plugin:note', x: 10, y: 10, w: 6, h: 4, z: 1 },
    ]
    store.config.widgets = {
      'plugin:note': { note: 'hello' },
      clock: { size: 'md' },
    }

    store.uninstallPlugin('note')

    expect(store.config.plugins).toHaveLength(0)
    expect(store.config.slots.map((s) => s.id)).toEqual(['s1'])
    expect(store.config.widgets['plugin:note']).toBeUndefined()
    expect(store.config.widgets.clock).toEqual({ size: 'md' })
  })

  it('卸载未知 id 不影响其余数据', () => {
    const store = useConfigStore()
    store.config.plugins = [
      { id: 'countdown', name: '倒计时', version: '0.1.0', enabled: true, permissions: [] },
    ]
    store.uninstallPlugin('nope')
    expect(store.config.plugins).toHaveLength(1)
  })
})
