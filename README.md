# Hyacinth 风信子

简洁、高度可定制的 Chrome / Edge 新标签页扩展。核心是「主题 + 插件」双层扩展机制：主题是纯声明式的皮肤，插件是跑在沙箱里的功能，两者自由组合。

A minimal, highly customizable new tab page extension for Chrome / Edge, built around two extension layers: declarative **themes** and sandboxed **plugins**.

![status](https://img.shields.io/badge/status-v0.1.0-beta-8b7cf8) ![license](https://img.shields.io/badge/license-MIT-8b7cf8)

## 特性 Features

- **画布布局**：24×24 虚拟网格上自由拖拽、八向缩放、中心吸附参考线、层级管理，所有挂件位置你说了算
- **主题系统**：声明式主题（CSS 变量总线），内置夜幕 / 晨雾 / 苔原三款；支持自定义背景（纯色 / 渐变 / 本地图片）、模糊与亮度调节、主题文件导入导出
- **插件系统**：第三方插件运行在 `sandbox` iframe 里，经版本化 postMessage 协议与宿主通信，按权限清单（存储 / 主题 / 布局 / 域名白名单网络代理）逐项放行
- **插件市场**：官方 registry 索引 + URL 直接安装；本地 localhost 调试零门槛
- **GitHub 云端同步**：配置树同步到你账号下的 secret gist，多台设备共享一切；令牌只存本机
- **内置挂件**：时钟（模拟 / 数字）、多引擎搜索、快捷方式；示例插件：倒计时、一言、随手记

## 路线图 Roadmap

| 里程碑 | 内容                                         | 状态 |
| ------ | -------------------------------------------- | ---- |
| M1     | MVP：时钟 / 搜索 / 快捷方式 / 背景设置       | ✅   |
| M2     | 画布布局引擎：自由拖拽 / 缩放 / 吸附 / 层级  | ✅   |
| M3     | 主题系统：CSS 变量总线 + 内置主题 + 导入导出 | ✅   |
| M4     | 插件系统：沙箱协议 + 权限管控 + SDK          | ✅   |
| M5     | 插件市场：registry + URL 安装 + 开发者文档   | ✅   |
| M6     | GitHub 云端同步                              | ✅   |
| M7     | 发布打磨：图标 / 商店文案 / 打包流程         | ✅   |
| 下一步 | i18n、Firefox、SDK npm 包独立发布            | 🚧   |

## 安装 Install

- **在线安装**：Chrome Web Store / Edge Add-ons（上架中，先见 [发布状态](./docs/publish.md)）
- **手动加载**：下载 [Releases](https://github.com/FatPanda8885/Hyacinth/releases) 的 `hyacinth-<版本>.zip`，解压后在 `chrome://extensions` 开启开发者模式 →「加载已解压的扩展程序」选择解压目录

## 开发 Development

环境要求 Requirements: Node.js ≥ 22, npm ≥ 10.

```bash
npm install
npm run dev        # 启动开发服务器（Vite + HMR）
npm test           # 单元测试（Vitest，121+）
npm run lint       # ESLint
npm run typecheck  # vue-tsc
npm run build      # 产物输出到 dist/
npm run build:zip  # dist 打包为 hyacinth-<版本>.zip（商店上传用）
npm run icons      # 重新生成 public/icons 图标（需 Pillow）
```

**本地调试扩展**：`npm run build` 后在 `chrome://extensions` 开启开发者模式 →「加载已解压的扩展程序」选 `dist/`；或直接跑 `npm run dev` 后访问 `http://localhost:5173/src/newtab/index.html` 预览页面（插件沙箱与商店权限等扩展能力以 `dist/` 加载为准）。

**写一个插件**：见 [docs/plugin-dev.md](./docs/plugin-dev.md) —— 一个 HTML 页面 + postMessage 协议，5 分钟上手。

## 目录结构 Structure

```
src/
├── newtab/       # 新标签页（画布舞台）
├── options/      # 设置页（通用/外观/快捷方式/插件市场/同步/关于）
├── background/   # service worker
├── core/         # 内核：布局引擎、插件宿主、同步客户端（不依赖 Vue）
├── widgets/      # 内置挂件（clock/search/shortcuts/plugin）
├── plugins/      # 内置示例插件源码 + registry 客户端
├── themes/       # 主题（CSS 变量总线 + 内置主题）
├── plugin-sdk/   # 插件协议与 SDK 客户端
├── platform/     # 浏览器 API 抽象层（chrome.* 收口，为 Firefox 预留）
├── stores/       # Pinia store
└── shared/       # 类型、配置 schema 与迁移
registry/         # 官方插件索引仓库骨架（复制到 hyacinth-plugins）
docs/             # 插件开发指南、发布清单
scripts/          # 图标生成等脚本
```

## 隐私 Privacy

所有配置只保存在本机（`chrome.storage.local`）；无任何遥测与统计。使用云同步时配置内容存放在你自己的 GitHub secret gist，访问令牌只保存在本机、绝不随配置同步。详见 [PRIVACY.md](./PRIVACY.md)。

## License

[MIT](./LICENSE)
