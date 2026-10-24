import type { Component } from 'vue'

/** 内置挂件的定义：组件 + 默认配置，注册进 registry 后由宿主装载 */
export interface WidgetDefinition {
  /** 挂件类型标识，同时是配置命名空间的键，如 'clock' */
  type: string
  /** 显示名（设置页/后续画布编辑模式用） */
  name: string
  /** Vue 组件 */
  component: Component
  /** 该挂件配置的默认值 */
  defaults: Record<string, unknown>
}

const registry = new Map<string, WidgetDefinition>()

/** 声明并注册一个挂件（各挂件的 index.ts 顶层调用） */
export function defineWidget(def: WidgetDefinition): WidgetDefinition {
  registry.set(def.type, def)
  return def
}

export function getWidget(type: string): WidgetDefinition | undefined {
  return registry.get(type)
}

export function listWidgets(): WidgetDefinition[] {
  return [...registry.values()]
}
