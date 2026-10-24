# core 内核

与 UI 框架无关的纯 TypeScript 层，Vue 只做渲染。

- `emitter.ts` — 类型安全事件总线
- M2: 画布布局引擎（虚拟网格坐标、拖拽/缩放、槽位生命周期）
- M4: 插件宿主（沙箱 iframe 管理、postMessage 协议）
