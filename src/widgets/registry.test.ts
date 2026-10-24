import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'

import { defineWidget, getWidget, listWidgets } from './registry'

const dummy = defineComponent({})
const cons = { minW: 2, minH: 2, defaultW: 6, defaultH: 4 }

describe('widget registry', () => {
  it('注册后可按类型取回', () => {
    defineWidget({
      type: 'test-a',
      name: 'A',
      component: dummy,
      defaults: { x: 1 },
      constraints: cons,
    })
    const def = getWidget('test-a')
    expect(def?.name).toBe('A')
    expect(def?.defaults).toEqual({ x: 1 })
  })

  it('未注册的类型返回 undefined', () => {
    expect(getWidget('nope-not-registered')).toBeUndefined()
  })

  it('同类型重复注册以后者为准', () => {
    defineWidget({ type: 'test-b', name: '旧', component: dummy, defaults: {}, constraints: cons })
    defineWidget({ type: 'test-b', name: '新', component: dummy, defaults: {}, constraints: cons })
    expect(getWidget('test-b')?.name).toBe('新')
    expect(listWidgets().filter((d) => d.type === 'test-b')).toHaveLength(1)
  })
})
