# hyacinth-plugins（官方插件索引仓库骨架）

把本目录内容复制到独立仓库 `FatPanda8885/hyacinth-plugins` 的 main 分支根目录即可。Hyacinth 默认从
`https://raw.githubusercontent.com/FatPanda8885/hyacinth-plugins/main/registry.json` 拉取索引。

- `registry.json`：插件索引。第三方作者提 PR 在 `plugins` 数组追加条目（格式见主仓库
  `docs/plugin-dev.md`），合并后即对所有用户可见。
- 校验规则：`id` 全局唯一（`^[a-z0-9][a-z0-9-]{0,63}$`）；`entryUrl` 必须 https；`version` 语义化；
  `permissions` 只能是 `storage` / `theme` / `layout` / `settings` / `fetch:<host>`。
- 审核重点：声明的权限与插件实际行为一致；`fetch` 域名最小化；入口页不含恶意跳转与统计滥用。

> 注意：本目录属于 Hyacinth 主仓库，仅作为索引仓库的模板与文档留档；真正的索引以独立仓库为准。
