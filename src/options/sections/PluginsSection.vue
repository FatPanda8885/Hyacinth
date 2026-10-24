<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import { fetchPermissionOrigins, requestOriginPermission } from '@/platform/permissions'
import { BUNDLED_PLUGINS } from '@/plugins/catalog'
import {
  DEFAULT_REGISTRY_URL,
  fetchRegistry,
  parseRegistryEntry,
  toInstalled,
  type RegistryEntry,
} from '@/plugins/registry'
import type { InstalledPlugin } from '@/shared/types'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()

// ---- 已安装列表（内置 + 远程统一呈现） ----

type Row = {
  id: string
  name: string
  description: string
  version: string
  permissions: string[]
  remote: boolean
  installed?: InstalledPlugin
}

const rows = computed<Row[]>(() => {
  const bundled: Row[] = BUNDLED_PLUGINS.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    version: p.version,
    permissions: [...p.permissions],
    remote: false,
    installed: store.config.plugins.find((i) => i.id === p.id && !i.entryUrl),
  }))
  const remote: Row[] = store.config.plugins
    .filter((p) => p.entryUrl)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      version: p.version,
      permissions: [...p.permissions],
      remote: true,
      installed: p,
    }))
  return [...bundled, ...remote]
})

const PERMISSION_LABELS: Record<string, string> = {
  storage: '本地存储',
  theme: '读取主题',
  layout: '调整尺寸',
  settings: '打开设置',
}

function permissionLabel(p: string): string {
  if (p.startsWith('fetch:')) return `访问 ${p.slice('fetch:'.length)}`
  return PERMISSION_LABELS[p] ?? p
}

const notice = ref('')

/** 为一组权限申请 fetch origin 授权（需在用户手势内调用）；失败返回被拒 origin */
async function grantFetchOrigins(permissions: string[]): Promise<string | null> {
  for (const permission of permissions) {
    for (const origin of fetchPermissionOrigins(permission)) {
      const granted = await requestOriginPermission(origin)
      if (!granted) return origin
    }
  }
  return null
}

/** 启用/停用 */
async function toggle(row: Row): Promise<void> {
  notice.value = ''
  if (row.installed?.enabled) {
    store.upsertPlugin({ ...row.installed, enabled: false })
    return
  }
  const denied = await grantFetchOrigins(row.permissions)
  if (denied) {
    notice.value = `未获授权：${denied}（该插件需要访问对应网站）`
    return
  }
  store.upsertPlugin({
    id: row.id,
    name: row.name,
    version: row.version,
    enabled: true,
    permissions: [...row.permissions],
    ...(row.installed?.entryUrl
      ? {
          entryUrl: row.installed.entryUrl,
          description: row.description,
          constraints: row.installed.constraints,
        }
      : {}),
  })
}

/** 卸载（仅远程插件）：移除记录、画布槽位与存储 */
function uninstall(row: Row): void {
  notice.value = ''
  if (!window.confirm(`卸载插件「${row.name}」？将同时移除画布上的挂件与其本地数据。`)) return
  store.uninstallPlugin(row.id)
  notice.value = `已卸载「${row.name}」`
}

// ---- 插件市场（registry 索引） ----

const registryUrlInput = ref(localStorage.getItem('hyacinth:registry-url') ?? DEFAULT_REGISTRY_URL)
const market = ref<RegistryEntry[] | null>(null)
const marketState = ref<'idle' | 'loading' | 'error'>('idle')
const marketError = ref('')

async function loadMarket(): Promise<void> {
  notice.value = ''
  marketState.value = 'loading'
  marketError.value = ''
  localStorage.setItem('hyacinth:registry-url', registryUrlInput.value.trim())
  try {
    const registry = await fetchRegistry(registryUrlInput.value.trim() || DEFAULT_REGISTRY_URL)
    market.value = registry.plugins
    marketState.value = 'idle'
  } catch (err) {
    market.value = null
    marketError.value = err instanceof Error ? err.message : '未知错误'
    marketState.value = 'error'
  }
}

function marketStateOf(entry: RegistryEntry): 'none' | 'installed' | 'updatable' {
  const installed = store.config.plugins.find((p) => p.id === entry.id && p.entryUrl)
  if (!installed) return 'none'
  return installed.version === entry.version ? 'installed' : 'updatable'
}

async function install(entry: RegistryEntry): Promise<void> {
  notice.value = ''
  const denied = await grantFetchOrigins(entry.permissions)
  if (denied) {
    notice.value = `未获授权：${denied}（该插件需要访问对应网站）`
    return
  }
  store.upsertPlugin(toInstalled(entry))
  notice.value = `已安装「${entry.name}」v${entry.version}：到新标签页「编辑布局 → 添加挂件」放置它`
}

// ---- URL 直接安装 ----

const BASE_PERMS = ['storage', 'theme', 'layout', 'settings'] as const

const urlForm = reactive({
  entryUrl: '',
  name: '',
  perms: { storage: true, theme: true, layout: true, settings: false } as Record<string, boolean>,
  fetchHosts: '',
})
const urlError = ref('')

function installFromUrl(): void {
  urlError.value = ''
  notice.value = ''
  const permissions = [
    ...BASE_PERMS.filter((p) => urlForm.perms[p]),
    ...urlForm.fetchHosts
      .split(/[,，\s]+/)
      .filter(Boolean)
      .map((h) => `fetch:${h.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}`),
  ]
  // 复用索引条目校验：id 由入口 URL 主机名派生，同名插件需先卸载
  let host: string
  try {
    host = new URL(urlForm.entryUrl.trim()).hostname
  } catch {
    urlError.value = '入口 URL 不合法（需 http(s) 完整地址）'
    return
  }
  const candidate = parseRegistryEntry({
    id:
      host
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/^-+|-+$/g, '') || 'site-plugin',
    name: urlForm.name.trim() || host,
    description: 'URL 手动安装',
    version: '0.0.1',
    entryUrl: urlForm.entryUrl.trim(),
    permissions,
  })
  if (!candidate) {
    urlError.value = '表单不完整：检查 URL、名称与权限（fetch 域名格式如 api.example.com）'
    return
  }
  if (store.config.plugins.some((p) => p.id === candidate.id && p.entryUrl)) {
    urlError.value = `已有同 id 插件「${candidate.id}」，请先卸载再安装`
    return
  }
  void install(candidate)
  urlForm.entryUrl = ''
  urlForm.name = ''
  urlForm.fetchHosts = ''
}

onMounted(() => {
  // 首次进入自动拉一次官方索引，失败不打扰（用户可手动重试）
  if (!market.value) void loadMarket()
})
</script>

<template>
  <div class="card">
    <p class="tip">
      插件运行在沙箱中，只能使用声明的权限。启用后到新标签页「编辑布局 →
      添加挂件」放置；远程插件可随时卸载。
    </p>

    <h3 class="section-title">已安装</h3>
    <div v-for="row in rows" :key="row.id" class="plugin-row">
      <div class="info">
        <div class="head">
          <span class="name">{{ row.name }}</span>
          <span class="version">v{{ row.installed?.version ?? row.version }}</span>
          <span v-if="row.remote" class="badge">远程</span>
        </div>
        <p class="desc">{{ row.description }}</p>
        <div class="perms">
          <span v-for="perm in row.permissions" :key="perm" class="chip">
            {{ permissionLabel(perm) }}
          </span>
        </div>
      </div>
      <div class="actions">
        <button
          type="button"
          class="toggle"
          :class="{ on: row.installed?.enabled }"
          @click="toggle(row)"
        >
          {{ row.installed?.enabled ? '已启用' : '启用' }}
        </button>
        <button v-if="row.remote" type="button" class="remove" @click="uninstall(row)">卸载</button>
      </div>
    </div>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <h3 class="section-title">插件市场</h3>
    <div class="registry-bar">
      <input
        v-model="registryUrlInput"
        class="registry-input"
        type="url"
        placeholder="registry.json 地址"
        spellcheck="false"
      />
      <button
        type="button"
        class="toggle"
        :disabled="marketState === 'loading'"
        @click="loadMarket"
      >
        {{ marketState === 'loading' ? '加载中…' : '刷新' }}
      </button>
    </div>

    <p v-if="marketState === 'error'" class="notice" role="alert">
      {{ marketError }}（检查地址，或先跳过市场、用下方 URL 安装）
    </p>
    <p v-else-if="market && market.length === 0" class="empty">索引为空</p>

    <div v-for="entry in market" :key="entry.id" class="plugin-row market-row">
      <div class="info">
        <div class="head">
          <span class="name">{{ entry.name }}</span>
          <span class="version">v{{ entry.version }}</span>
          <span v-if="entry.author" class="author">{{ entry.author }}</span>
        </div>
        <p class="desc">{{ entry.description }}</p>
        <div class="perms">
          <span v-for="perm in entry.permissions" :key="perm" class="chip">
            {{ permissionLabel(perm) }}
          </span>
        </div>
      </div>
      <button
        type="button"
        class="toggle"
        :class="{ on: marketStateOf(entry) !== 'none' }"
        :disabled="marketStateOf(entry) === 'installed'"
        @click="install(entry)"
      >
        {{
          marketStateOf(entry) === 'installed'
            ? '已安装'
            : marketStateOf(entry) === 'updatable'
              ? `更新到 v${entry.version}`
              : '安装'
        }}
      </button>
    </div>

    <h3 class="section-title">从 URL 安装</h3>
    <p class="tip">适合未收录进市场的插件或本地开发调试（http 仅限 localhost / 127.0.0.1）。</p>
    <div class="url-form">
      <input
        v-model="urlForm.entryUrl"
        type="url"
        placeholder="插件入口 https://…/plugin.html"
        spellcheck="false"
      />
      <input v-model="urlForm.name" type="text" placeholder="名称（可选）" maxlength="40" />
      <div class="perm-picker">
        <label v-for="p in BASE_PERMS" :key="p" class="pick">
          <input v-model="urlForm.perms[p]" type="checkbox" />
          {{ permissionLabel(p) }}
        </label>
        <input
          v-model="urlForm.fetchHosts"
          type="text"
          placeholder="fetch 域名（逗号分隔，可留空）如 api.example.com"
          spellcheck="false"
        />
      </div>
      <p v-if="urlError" class="notice" role="alert">{{ urlError }}</p>
      <button type="button" class="toggle" @click="installFromUrl">安装</button>
    </div>
  </div>
</template>

<style scoped>
.card {
  padding: 18px 22px 22px;
  border: 1px solid var(--hy-border);
  border-radius: var(--hy-radius);
  background: var(--hy-bg-soft);
}

.tip {
  margin: 0 0 14px;
  color: var(--hy-fg-muted);
  font-size: 13px;
}

.section-title {
  margin: 22px 0 10px;
  font-size: 14px;
  font-weight: 600;
}

.plugin-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 0;
}

.plugin-row + .plugin-row,
.market-row:first-of-type {
  border-top: 1px solid var(--hy-border);
}

.head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.name {
  font-size: 15px;
  font-weight: 600;
}

.version,
.author {
  font-size: 12px;
  color: var(--hy-fg-muted);
}

.badge {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid var(--hy-accent-soft);
  color: var(--hy-accent);
}

.desc {
  margin: 4px 0 8px;
  font-size: 13px;
  color: var(--hy-fg-muted);
}

.perms {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid var(--hy-border);
  color: var(--hy-fg-muted);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.toggle {
  flex-shrink: 0;
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid var(--hy-border);
  background: transparent;
  color: var(--hy-fg-muted);
  font-size: 13px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
}

.toggle:hover:not(:disabled) {
  color: var(--hy-fg);
  border-color: var(--hy-fg-muted);
}

.toggle.on {
  background: var(--hy-accent-soft);
  border-color: var(--hy-accent-soft);
  color: var(--hy-accent);
}

.toggle:disabled {
  opacity: 0.65;
  cursor: default;
}

.remove {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--hy-border);
  background: transparent;
  color: var(--hy-fg-muted);
  font-size: 13px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
}

.remove:hover {
  color: #e5484d;
  border-color: rgba(229, 72, 77, 0.45);
  background: rgba(229, 72, 77, 0.08);
}

.notice {
  margin: 12px 0 0;
  color: #e5484d;
  font-size: 13px;
}

.empty {
  margin: 8px 0 0;
  color: var(--hy-fg-muted);
  font-size: 13px;
}

.registry-input,
.url-form input[type='url'],
.url-form input[type='text'] {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--hy-border);
  background: var(--hy-bg);
  color: var(--hy-fg);
  font-size: 13px;
  line-height: 1.4;
  height: 36px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s ease;
}

.registry-input::placeholder,
.url-form input::placeholder {
  color: var(--hy-fg-muted);
}

.registry-input:focus,
.url-form input[type='url']:focus,
.url-form input[type='text']:focus {
  border-color: var(--hy-accent);
}

.registry-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.registry-input {
  flex: 1;
  min-width: 0;
}

/* 与输入框（8px 内边距 + 13px 字号）等高对齐 */
.registry-bar .toggle {
  flex-shrink: 0;
  height: 36px;
  padding: 0 18px;
}

.url-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--hy-border);
  border-radius: 10px;
  background: var(--hy-bg);
}

.url-form input[type='url'],
.url-form input[type='text'] {
  width: 100%;
  box-sizing: border-box;
}

.perm-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  font-size: 13px;
  color: var(--hy-fg-muted);
}

.perm-picker .pick {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--hy-border);
  border-radius: 8px;
  background: var(--hy-bg-soft);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.perm-picker .pick:hover {
  border-color: var(--hy-fg-muted);
  color: var(--hy-fg);
}

.perm-picker .pick:has(input:checked) {
  border-color: var(--hy-accent-soft);
  color: var(--hy-accent);
}

.perm-picker input[type='checkbox'] {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--hy-accent);
  cursor: pointer;
}

.perm-picker input[type='text'] {
  flex: 1;
  min-width: 220px;
  width: auto;
}

.url-form > .toggle {
  align-self: flex-start;
}
</style>
