# core 内核

与 UI 框架无关的纯 TypeScript 层，Vue 只做渲染。

- `emitter.ts` — 类型安全事件总线
- `layout/` — 画布布局引擎（M2）：24×24 虚拟网格、槽位 z 序、拖拽/缩放的纯逻辑
- M4: 插件宿主（沙箱 iframe 管理、postMessage 协议）
