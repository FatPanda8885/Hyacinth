<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getExtensionVersion } from '@/platform/runtime'
import { useConfigStore } from '@/stores/config'

const sections = [
  { id: 'general', label: '通用', hint: '语言、默认搜索引擎等基础项' },
  { id: 'appearance', label: '外观', hint: '主题管理与背景设置' },
  { id: 'widgets', label: '挂件', hint: '挂件与画布布局管理' },
  { id: 'plugins', label: '插件市场', hint: '发现、安装与管理第三方插件' },
  { id: 'about', label: '关于', hint: '版本与开源信息' },
] as const

type SectionId = (typeof sections)[number]['id']

const active = ref<SectionId>('about')
const version = getExtensionVersion()

const store = useConfigStore()
onMounted(() => void store.load())

const activeSection = computed(() => sections.find((s) => s.id === active.value))
</script>

<template>
  <div class="page">
    <aside class="side">
      <header class="brand">
        <span class="dot" aria-hidden="true"></span>
        Hyacinth 设置
      </header>
      <nav class="nav">
        <button
          v-for="s in sections"
          :key="s.id"
          :class="{ active: active === s.id }"
          type="button"
          @click="active = s.id"
        >
          {{ s.label }}
        </button>
      </nav>
      <footer class="meta">v{{ version }}</footer>
    </aside>

    <main class="panel">
      <h1>{{ activeSection?.label }}</h1>
      <p class="hint">{{ activeSection?.hint }}</p>

      <div v-if="active === 'about'" class="card">
        <dl class="facts">
          <dt>版本</dt>
          <dd>v{{ version }}</dd>
          <dt>配置 schema</dt>
          <dd>v{{ store.config.schemaVersion }}</dd>
          <dt>已安装插件</dt>
          <dd>{{ store.config.plugins.length }}</dd>
        </dl>
        <p class="note">Hyacinth 是开源项目（MIT License），主题与插件生态建设中。</p>
      </div>
      <div v-else class="card placeholder">建设中 · 对应路线图 M1+ 里程碑</div>
    </main>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
}

.side {
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  border-right: 1px solid var(--hy-border);
  background: var(--hy-bg-soft);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  padding: 4px 10px 18px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(180deg, var(--hy-accent), #4c3fd2);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav button {
  padding: 9px 12px;
  border: none;
  border-radius: var(--hy-radius);
  background: transparent;
  color: var(--hy-fg-muted);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.nav button:hover {
  color: var(--hy-fg);
  background: var(--hy-accent-soft);
}

.nav button.active {
  color: var(--hy-fg);
  background: var(--hy-accent-soft);
}

.meta {
  margin-top: auto;
  padding: 10px;
  color: var(--hy-fg-muted);
  font-size: 12px;
}

.panel {
  padding: 36px 44px;
  max-width: 720px;
}

.panel h1 {
  margin: 0 0 4px;
  font-size: 22px;
}

.hint {
  margin: 0 0 20px;
  color: var(--hy-fg-muted);
  font-size: 14px;
}

.card {
  padding: 22px;
  border: 1px solid var(--hy-border);
  border-radius: var(--hy-radius);
  background: var(--hy-bg-soft);
}

.placeholder {
  color: var(--hy-fg-muted);
}

.facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px 22px;
  margin: 0;
}

.facts dt {
  color: var(--hy-fg-muted);
}

.facts dd {
  margin: 0;
}

.note {
  margin: 18px 0 0;
  color: var(--hy-fg-muted);
  font-size: 13px;
}
</style>
