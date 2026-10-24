# Hyacinth 插件开发指南

Hyacinth（风信子）的插件是一个**普通网页**：一个 HTML 入口（可带自己的 JS/CSS），被宿主以 `sandbox="allow-scripts"` 的 iframe 嵌入新标签页画布。插件与宿主之间只通过 postMessage 协议通信，宿主按插件声明的权限逐项放行能力。

## 快速开始（5 分钟）

1. **写入口页面**（静态托管即可，GitHub Pages / 任意 https 静态空间）：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <style>
      /* 兜底色：宿主下发主题后会覆盖 --hy-* 变量 */
      :root {
        --hy-accent: #8b7cf8;
        --hy-on-bg: #fff;
        --hy-on-bg-muted: rgba(255, 255, 255, 0.72);
      }
      body {
        margin: 0;
        height: 100vh;
        display: grid;
        place-content: center;
        font-family: system-ui;
        color: var(--hy-on-bg);
      }
    </style>
  </head>
  <body>
    <div id="out">连接中…</div>
    <script type="module">
      // SDK npm 包发布前，可先从本仓库 src/plugin-sdk/client.ts 复制客户端代码，
      // 或参考下方「协议速览」自行实现握手
      import { HyacinthPlugin } from './sdk.js'

      const plugin = new HyacinthPlugin()
      const out = document.getElementById('out')

      void plugin.ready.then(async () => {
        plugin.applyTheme() // 应用宿主主题变量
        plugin.onThemeChange = (v) => plugin.applyTheme(v)

        const saved = await plugin.getStorage('note')
        out.textContent = saved ?? '点我写一句话'
        out.onclick = async () => {
          const text = prompt('写点什么？')
          if (text) {
            await plugin.setStorage('note', text)
            out.textContent = text
          }
        }
      })
    </script>
  </body>
</html>
```

2. **本地调试**：在本地起静态服务（如 `python -m http.server`），到 Hyacinth 设置页 → 插件 → 「从 URL 安装」，粘贴 `http://127.0.0.1:8000/my-plugin.html`（http 仅放行本机回环）。安装后在新标签页「编辑布局 → 添加挂件」放置它。

3. **发布**：把插件托管到 https，然后向 [hyacinth-plugins](https://github.com/FatPanda8885/hyacinth-plugins) 仓库提 PR，在 `registry.json` 的 `plugins` 数组加一条记录，通过审核后即可被所有用户在「插件市场」搜到安装。

## SDK API

`HyacinthPlugin`（`@hyacinth/plugin-sdk`，随 M5 后发布；当前可直接复制 `src/plugin-sdk/client.ts`）：

| API                                                                 | 权限           | 说明                                                                                  |
| ------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `ready: Promise<void>`                                              | —              | 握手完成（收到宿主 init）后 resolve                                                   |
| `getStorage(key)` / `setStorage(key, value)` / `removeStorage(key)` | `storage`      | 插件独立命名空间的持久化存储（key 限 `[\w.-]{1,64}`，值必须是可 JSON 序列化的纯数据） |
| `getTheme()` / `applyTheme(vars?)`                                  | `theme`        | 读取/应用主题变量；`onThemeChange` 回调实时跟随用户切换主题                           |
| `resizeSlot(w, h)`                                                  | `layout`       | 请求调整自己槽位的网格尺寸（宿主按插件约束钳制）                                      |
| `openSettings()`                                                    | `settings`     | 打开宿主设置页                                                                        |
| `fetch(url)`                                                        | `fetch:<host>` | 经宿主代理的网络请求（避开沙箱 CORS），返回 `{ status, body }`（body 截断 200 KB）    |

## 权限

```jsonc
["storage", "theme", "layout", "settings"]   // 基础权限
["fetch:v1.hitokoto.cn"]                      // 网络：精确 host
["fetch:*.example.com"]                       // 网络：主域通配（含 example.com 本身）
```

- 权限在安装/启用时向用户展示；`fetch:` 权限会触发浏览器扩展的 origin 授权弹窗。
- 未声明权限调用对应 RPC 会收到 `权限不足` 错误。
- `fetch` 只能访问已声明权限的 host，由宿主代理发起。

## 协议速览（自行实现客户端时）

```
插件 → 宿主： { v: 1, type: 'hello', protocol: 1 }
宿主 → 插件： { v: 1, type: 'init', protocol: 1, payload: { permissions, theme } }
插件 → 宿主： { v: 1, type: 'rpc', id: 'r1', method: 'storage.get', params: { key } }
宿主 → 插件： { v: 1, type: 'rpc-result', id: 'r1', ok: true, result: ... }   // 或 ok:false + error
宿主 → 插件： { v: 1, type: 'theme', payload: { --hy-*: value } }             // 主题切换推送
```

RPC 方法：`storage.get/set/remove`、`theme.get`、`layout.resize`、`settings.open`、`fetch`。
所有消息经 `parent.postMessage(msg, '*')` 发送；宿主按消息来源 iframe 归属，忽略一切非法形状。

## registry.json 记录格式

```jsonc
{
  "v": 1,
  "plugins": [
    {
      "id": "my-plugin", // 小写字母/数字/连字符，全局唯一
      "name": "我的插件",
      "description": "一句话介绍（≤200 字）",
      "version": "1.0.0",
      "author": "yourname",
      "entryUrl": "https://example.github.io/hyacinth-my-plugin/index.html",
      "permissions": ["storage", "theme", "fetch:api.example.com"],
      "constraints": { "minW": 3, "minH": 2, "defaultW": 6, "defaultH": 4 }, // 可选，网格单位
    },
  ],
}
```

宿主对索引做逐条校验：`id` 格式、`entryUrl` 必须 https（本机回环 http 仅供调试）、`version` 语义化、权限串合法；坏记录整条丢弃，不影响其余条目。

## 安全模型

- 插件页运行在 `sandbox="allow-scripts"` 的 iframe 里：opaque origin，拿不到宿主页面、扩展 API 与自身源站的存储，唯一出口是 postMessage 协议。
- 插件不能执行在宿主上下文：MV3 扩展页面 CSP 禁止远程脚本，插件代码永远只在自己的沙箱里跑。
- 存储按插件 id 隔离；卸载即清除。
- 网络 fetch 由宿主代理且限白名单域名，插件无法读取宿主页面的 cookie。
