# 发布清单 / Publishing Guide

从源码到两个商店上架的完整流程。当前状态：**v0.1.0-beta，商店上架待办**。

## 0. 版本号约定

- `package.json` 的 `version` 是唯一真实来源；`manifest.config.ts` 从它读取（见 scripts/sync-version 或构建校验）。
- 约定：`0.x.y-beta` 内测 → `0.x.y` 正式。发版时同步打 git tag `v0.x.y`。

## 1. 构建

```bash
npm test && npm run lint && npm run typecheck   # 全绿再继续
npm run build        # 产物 → dist/
npm run build:zip    # 打包 → hyacinth-<版本>.zip
```

## 2. 手动冒烟（上传前必做）

以「加载已解压的扩展程序」加载 `dist/`，检查：

- [ ] 新标签页：默认布局渲染（时钟/搜索/快捷方式），拖拽缩放正常
- [ ] 主题切换 + 背景图片 + 模糊/亮度实时预览
- [ ] 插件：倒计时（编辑/保存/尺寸收缩）、一言（取句/换一句）
- [ ] 插件市场分页 + URL 安装（本地起 `python -m http.server` 装一个测试插件）
- [ ] 同步分页：无效 token 的错误提示路径
- [ ] 设置页所有分页切换动画正常，无 console 报错

## 3. Chrome Web Store

1. [开发者注册](https://chrome.google.com/webstore/devconsole)（一次性 $5）
2. 「新增项目」上传 `hyacinth-<版本>.zip`
3. 商店资料：
   - 名称：Hyacinth — 简洁可定制的新标签页（英文：Hyacinth — Minimal Custom New Tab）
   - 简介（132 字符内）：画布布局 + 声明式主题 + 沙箱插件市场 + GitHub 云同步，全部数据只存本机。
   - 详细描述：README「特性」段落翻译 + 隐私声明链接
   - 分类：生产力工具 / Productivity；语言：中文（简体）+ English
   - 图标：`public/icons/icon-128.png`
   - 截图：至少 5 张 1280×800（新标签页默认布局、编辑模式网格、主题切换、插件市场、同步设置）
4. 隐私：单选「我不出售数据」；权限用途填写（见 PRIVACY.md）
5. 注意：`optional_host_permissions` 与 sandbox 页面会触发人工审核，说明文案里主动解释「插件运行在沙箱中、按域名逐个授权」

## 4. Edge Add-ons

1. [合作伙伴中心](https://partner.microsoft.com/dashboard/microsoftedge) 注册
2. 「Create new extension」上传同一 zip
3. 商店资料同上；Edge 对 MV3 sandbox 的审核与 Chrome 类似
4. 网站/隐私政策 URL 填仓库内 PRIVACY.md 的 GitHub 原始链接

## 5. GitHub Release

1. `git tag v0.x.y && git push --tags`
2. Release notes：本里程碑 PR 列表 + 截图
3. 附件：`hyacinth-<版本>.zip`

## 6. 官方插件索引（可选，建议尽早）

创建公开仓库 `FatPanda8885/hyacinth-plugins`，把主仓库 `registry/` 目录内容推到 main：

```bash
git clone https://github.com/FatPanda8885/hyacinth-plugins
cp -r Hyacinth/registry/* hyacinth-plugins/
git add -A && git commit -m "init registry" && git push
```

（可选）开 GitHub Pages 托管示例插件 `plugins/note/`，registry.json 里的 entryUrl 指向 Pages 地址。
