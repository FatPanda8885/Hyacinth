import { describe, expect, it, vi } from 'vitest'

import { Emitter } from './emitter'

type TestEvents = {
  ping: number
  name: string
}

describe('Emitter', () => {
  it('向订阅者分发事件', () => {
    const emitter = new Emitter<TestEvents>()
    const fn = vi.fn()
    emitter.on('ping', fn)
    emitter.emit('ping', 42)
    expect(fn).toHaveBeenCalledWith(42)
  })

  it('on() 返回的句柄可取消订阅', () => {
    const emitter = new Emitter<TestEvents>()
    const fn = vi.fn()
    const off = emitter.on('name', fn)
    off()
    emitter.emit('name', 'x')
    expect(fn).not.toHaveBeenCalled()
  })

  it('off() 直接取消订阅', () => {
    const emitter = new Emitter<TestEvents>()
    const fn = vi.fn()
    emitter.on('ping', fn)
    emitter.off('ping', fn)
    emitter.emit('ping', 1)
    expect(fn).not.toHaveBeenCalled()
  })

  it('once() 只触发一次', () => {
    const emitter = new Emitter<TestEvents>()
    const fn = vi.fn()
    emitter.once('ping', fn)
    emitter.emit('ping', 1)
    emitter.emit('ping', 2)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('事件类型之间互不影响', () => {
    const emitter = new Emitter<TestEvents>()
    const fn = vi.fn()
    emitter.on('ping', fn)
    emitter.emit('name', 'x')
    expect(fn).not.toHaveBeenCalled()
  })

  it('监听器内退订自身不影响本次分发', () => {
    const emitter = new Emitter<TestEvents>()
    const seen: number[] = []
    emitter.on('ping', (n) => {
      seen.push(n)
    })
    const off = emitter.on('ping', () => off())
    emitter.emit('ping', 7)
    expect(seen).toEqual([7])
  })

  it('clear() 清空所有订阅', () => {
    const emitter = new Emitter<TestEvents>()
    const fn = vi.fn()
    emitter.on('ping', fn)
    emitter.once('name', fn)
    emitter.clear()
    emitter.emit('ping', 1)
    emitter.emit('name', 'x')
    expect(fn).not.toHaveBeenCalled()
  })
})
