export type EventMap = Record<string, unknown>

export type Listener<T> = (payload: T) => void

/**
 * 轻量类型安全事件总线。core 层（布局引擎、宿主、同步层）解耦通信用；
 * 与 UI 框架无关，可被 Vue 组件、service worker、测试直接使用。
 *
 * 注意：事件表请用 type 别名声明（interface 缺少隐式索引签名，
 * 无法满足 EventMap 约束）。
 */
export class Emitter<Events extends EventMap> {
  private listeners = new Map<keyof Events, Set<Listener<never>>>()

  /** 订阅，返回取消订阅函数 */
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const set = this.listeners.get(event) ?? new Set()
    set.add(listener as Listener<never>)
    this.listeners.set(event, set)
    return () => this.off(event, listener)
  }

  /** 订阅一次 */
  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const off = this.on(event, (payload) => {
      off()
      listener(payload)
    })
    return off
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<never>)
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event)
    if (!set) return
    // 拷贝一份：允许监听器在回调中安全地订阅/退订
    for (const listener of [...set]) {
      ;(listener as Listener<Events[K]>)(payload)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}
