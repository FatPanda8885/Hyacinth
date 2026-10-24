<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { getExtensionVersion } from '@/platform/runtime'
import { useConfigStore } from '@/stores/config'
import { useTheme } from '@/themes/useTheme'

import AppearanceSection from './sections/AppearanceSection.vue'
import GeneralSection from './sections/GeneralSection.vue'
import ShortcutsSection from './sections/ShortcutsSection.vue'

const sections = [
  { id: 'general', label: '通用', hint: '搜索引擎与时钟的基础设置' },
  { id: 'appearance', label: '外观', hint: '主题切换、背景自定义与主题导入导出' },
  { id: 'widgets', label: '快捷方式', hint: '管理新标签页上的快捷方式磁贴' },
  { id: 'plugins', label: '插件市场', hint: '发现、安装与管理第三方插件' },
  { id: 'about', label: '关于', hint: '版本与开源信息' },
] as const

type SectionId = (typeof sections)[number]['id']
const active = ref<SectionId>('general')
const version = getExtensionVersion()

// 分区切换的转场方向：往后切从右滑入，往回切从左滑入
const transitionName = ref<'slide-left' | 'slide-right'>('slide-left')
watch(active, (to, from) => {
  const toIdx = sections.findIndex((s) => s.id === to)
  const fromIdx = sections.findIndex((s) => s.id === from)
  transitionName.value = toIdx >= fromIdx ? 'slide-left' : 'slide-right'
})

const store = useConfigStore()
useTheme() // 设置页同样应用主题变量（配置变化/跨页同步自动联动）
const activeSection = computed(() => sections.find((s) => s.id === active.value))

const saveLabel = computed(() => {
  if (store.saveState === 'pending') return '保存中…'
  if (store.saveState === 'saved') return '已保存'
  return ''
})

// 防抖写盘期间页面被关闭，尽量补一次落盘
function flushSoon(): void {
  void store.flush()
}

onMounted(() => {
  void store.init()
  window.addEventListener('beforeunload', flushSoon)
  document.addEventListener('visibilitychange', flushSoon)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', flushSoon)
  document.removeEventListener('visibilitychange', flushSoon)
})
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
      <footer class="meta">
        <span>v{{ version }}</span>
        <span class="save" :class="store.saveState">{{ saveLabel }}</span>
      </footer>
    </aside>

    <main class="panel">
      <Transition :name="transitionName" mode="out-in">
        <div :key="active" class="panel-body">
          <h1>{{ activeSection?.label }}</h1>
          <p class="hint">{{ activeSection?.hint }}</p>

          <GeneralSection v-if="active === 'general'" />
          <AppearanceSection v-else-if="active === 'appearance'" />
          <ShortcutsSection v-else-if="active === 'widgets'" />
          <div v-else-if="active === 'plugins'" class="card placeholder">
            建设中 · 插件市场对应路线图 M5
          </div>

          <div v-else-if="active === 'about'" class="card">
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
        </div>
      </Transition>
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

.nav button:hover,
.nav button.active {
  color: var(--hy-fg);
  background: var(--hy-accent-soft);
}

.meta {
  margin-top: auto;
  padding: 10px;
  color: var(--hy-fg-muted);
  font-size: 12px;
  display: flex;
  justify-content: space-between;
}

.save {
  color: var(--hy-accent);
  min-width: 3em;
  text-align: right;
}

.panel {
  padding: 36px 44px;
  max-width: 760px;
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

/* 分区切换转场（out-in 顺序播放）：往后切新内容从右滑入，往回切从左滑入 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(14px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-14px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(14px);
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
