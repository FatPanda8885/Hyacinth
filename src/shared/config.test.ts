import { describe, expect, it } from 'vitest'

import { DEFAULT_CONFIG, migrate } from './config'

describe('config/migrate', () => {
  it('非法输入回默认配置', () => {
    const cfg = migrate(null)
    expect(cfg).toEqual(DEFAULT_CONFIG)
    expect(cfg.theme.id).toBe('night')
  })

  it('M1/M2 的空 slots 回种默认布局', () => {
    expect(migrate({ slots: [] }).slots).toEqual(DEFAULT_CONFIG.slots)
  })

  it('M1/M2 的 theme.id "default" 映射为 "night"', () => {
    const cfg = migrate({ theme: { id: 'default', variables: {} } })
    expect(cfg.theme.id).toBe('night')
  })

  it('M2 及更早的 widgets.background 收编为 theme.background', () => {
    const cfg = migrate({
      theme: { id: 'night', variables: {} },
      widgets: { background: { type: 'color', value: '#123456' } },
    })
    expect(cfg.theme.background).toEqual({ type: 'color', value: '#123456' })
    expect(cfg.widgets.background).toBeUndefined()
  })

  it('theme.background 已存在时不被旧数据覆盖', () => {
    const cfg = migrate({
      theme: { id: 'mist', variables: {}, background: { type: 'color', value: '#abc' } },
      widgets: { background: { type: 'color', value: '#123' } },
    })
    expect(cfg.theme.background).toEqual({ type: 'color', value: '#abc' })
    expect(cfg.widgets.background).toBeUndefined()
  })

  it('主题变量经过清洗，非法键被剔除', () => {
    const cfg = migrate({
      theme: { id: 'x', variables: { '--hy-bg': '#000', javascript: 'alert(1)' } },
    })
    expect(cfg.theme.variables).toEqual({ '--hy-bg': '#000' })
  })

  it('customThemes 过滤结构不完整的项', () => {
    const cfg = migrate({
      customThemes: [{ id: 'ok', name: 'OK', variables: {} }, { id: 123, name: 'bad' }, null],
    })
    expect(cfg.customThemes).toHaveLength(1)
    expect(cfg.customThemes[0]?.id).toBe('ok')
  })
})
