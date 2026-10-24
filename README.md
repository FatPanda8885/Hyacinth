# Hyacinth 风信子

简洁、高度可定制的 Chrome / Edge 新标签页扩展。核心是「主题 + 插件」双层扩展机制：主题是纯声明式的皮肤，插件是跑在沙箱里的功能，两者可以自由组合。

A minimal, highly customizable new tab page extension for Chrome / Edge, built around two extension layers: declarative **themes** and sandboxed **plugins**.

## 状态 Status

M0 脚手架阶段 / M0 scaffold stage. 路线图 Roadmap:

| 里程碑 | 内容                                                 |
| ------ | ---------------------------------------------------- |
| M0 ✅  | 脚手架：Vite + CRXJS + Vue 3 + Pinia + TS + CI       |
| M1     | MVP：时钟 / 搜索 / 快捷方式 / 背景 + 设置页 + 存储层 |
| M2     | 画布布局引擎：自由拖拽 / 缩放 / 吸附 / 层级          |
| M3     | 主题系统：CSS 变量总线 + 内置主题 + 导入导出         |
| M4     | 插件系统：沙箱协议 + 权限管控 + SDK                  |
| M5     | 插件市场：registry + URL 安装 + 开发者文档           |
| M6     | GitHub 云端同步                                      |
| M7     | 发布：商店上架 / i18n / 无障碍 / 性能打磨            |

## 开发 Development

环境要求 Requirements: Node.js ≥ 22, npm ≥ 10.

```bash
npm install
npm run dev      # 启动开发服务器（Vite + HMR）
npm run build    # 产物输出到 dist/
npm test         # 单元测试（Vitest）
npm run lint     # ESLint
npm run typecheck
npm run icons    # 重新生成 public/icons 图标
```

**加载扩展 Load the extension:**

1. Chrome / Edge 打开 `chrome://extensions`
2. 开启「开发者模式」
3. 「加载已解压的扩展程序」选择项目下的 `dist/` 目录

开发模式下 CRXJS 会把 `dist/` 里的页面指向本地 Vite 开发服务器，改代码即可热更新（HTML 入口变更需在扩展页刷新一次）。

## 目录结构 Structure

```
src/
├── newtab/       # 新标签页入口（薄壳，装载内核）
├── options/      # 设置页
├── background/   # service worker
├── core/         # 内核：布局引擎、事件总线（不依赖 Vue）
├── widgets/      # 内置挂件
├── themes/       # 主题（CSS 变量）
├── platform/     # 浏览器 API 抽象层（chrome.* 收口，为 Firefox 预留）
├── stores/       # Pinia store
└── shared/       # 类型、配置 schema、工具
scripts/          # 构建/生成脚本
e2e/              # Playwright E2E（M1+ 启用）
```

## License

[MIT](./LICENSE)
