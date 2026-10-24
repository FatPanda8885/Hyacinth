<script setup lang="ts">
import { computed, ref } from 'vue'

import { fetchPermissionOrigins, requestOriginPermission } from '@/platform/permissions'
import { BUNDLED_PLUGINS, type PluginCatalogEntry } from '@/plugins/catalog'
import type { InstalledPlugin } from '@/shared/types'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()

function installedOf(id: string): InstalledPlugin | undefined {
  return store.config.plugins.find((p) => p.id === id)
}

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

/** 启用/停用；带 fetch 权限的插件启用前先申请对应 origin（用户手势上下文） */
async function toggle(entry: PluginCatalogEntry): Promise<void> {
  notice.value = ''
  const current = installedOf(entry.id)
  if (current?.enabled) {
    store.upsertPlugin({ ...current, enabled: false })
    return
  }
  for (const permission of entry.permissions) {
    for (const origin of fetchPermissionOrigins(permission)) {
      const granted = await requestOriginPermission(origin)
      if (!granted) {
        notice.value = `未获授权：${origin}（该插件需要访问对应网站）`
        return
      }
    }
  }
  store.upsertPlugin({
    id: entry.id,
    name: entry.name,
    version: entry.version,
    enabled: true,
    permissions: [...entry.permissions],
  })
}

const list = computed(() => BUNDLED_PLUGINS)
</script>

<template>
  <div class="card">
    <p class="tip">
      启用后，插件会出现在新标签页「编辑布局 →
      添加挂件」菜单里；插件运行在沙箱中，只能使用下方声明的权限。
    </p>

    <div v-for="p in list" :key="p.id" class="plugin-row">
      <div class="info">
        <div class="head">
          <span class="name">{{ p.name }}</span>
          <span class="version">v{{ p.version }}</span>
        </div>
        <p class="desc">{{ p.description }}</p>
        <div class="perms">
          <span v-for="perm in p.permissions" :key="perm" class="chip">
            {{ permissionLabel(perm) }}
          </span>
        </div>
      </div>
      <button
        type="button"
        class="toggle"
        :class="{ on: installedOf(p.id)?.enabled }"
        @click="toggle(p)"
      >
        {{ installedOf(p.id)?.enabled ? '已启用' : '启用' }}
      </button>
    </div>

    <p v-if="notice" class="notice" role="alert">{{ notice }}</p>

    <p class="market">第三方插件市场与 URL 安装将在 M5 上线。</p>
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

.plugin-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 0;
}

.plugin-row + .plugin-row {
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

.version {
  font-size: 12px;
  color: var(--hy-fg-muted);
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

.toggle:hover {
  color: var(--hy-fg);
  border-color: var(--hy-fg-muted);
}

.toggle.on {
  background: var(--hy-accent-soft);
  border-color: var(--hy-accent-soft);
  color: var(--hy-accent);
}

.notice {
  margin: 12px 0 0;
  color: #e5484d;
  font-size: 13px;
}

.market {
  margin: 16px 0 0;
  color: var(--hy-fg-muted);
  font-size: 12px;
}
</style>
