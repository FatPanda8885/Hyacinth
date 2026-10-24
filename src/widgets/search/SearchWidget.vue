<script setup lang="ts">
import { computed, ref } from 'vue'

import { useConfigStore } from '@/stores/config'

import { SEARCH_DEFAULTS, SEARCH_ENGINES, type SearchConfig, getSearchEngine } from './engines'

const store = useConfigStore()
store.ensureWidgetDefaults('search', SEARCH_DEFAULTS)
const cfg = computed(() => store.config.widgets.search as SearchConfig)

const engine = computed(() => getSearchEngine(cfg.value.engine))
const engineId = computed({
  get: () => engine.value.id,
  set: (id: string) => store.updateWidget('search', { engine: id }),
})

const query = ref('')

function go(): void {
  const q = query.value.trim()
  if (!q) return
  window.location.href = engine.value.buildUrl(q)
}

// ---- 自定义引擎下拉（原生 select 无法定制下拉面板样式） ----
// 菜单与遮罩 Teleport 到 body：挂件槽位有 overflow:hidden 会裁掉向下展开的
// 菜单；且 .search 的 backdrop-filter 会把内部 fixed 元素的包含块变成胶囊自身。
const open = ref(false)
const highlight = ref(0)
const buttonRef = ref<HTMLElement | null>(null)
const menuPos = ref({ left: 0, top: 0 })

function toggle(): void {
  if (open.value) {
    open.value = false
  } else {
    highlight.value = SEARCH_ENGINES.findIndex((e) => e.id === engine.value.id)
    const rect = buttonRef.value?.getBoundingClientRect()
    menuPos.value = rect
      ? { left: rect.left, top: Math.round(rect.bottom + 8) }
      : { left: 0, top: 0 }
    open.value = true
  }
}

function choose(id: string): void {
  engineId.value = id
  open.value = false
}

function move(delta: number): void {
  if (!open.value) toggle()
  const n = SEARCH_ENGINES.length
  highlight.value = (highlight.value + delta + n) % n
}

function chooseHighlighted(): void {
  if (open.value) choose(SEARCH_ENGINES[highlight.value].id)
}
</script>

<template>
  <form class="search" @submit.prevent="go">
    <div
      class="picker"
      @keydown.esc="open = false"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="chooseHighlighted"
    >
      <button
        ref="buttonRef"
        type="button"
        class="engine"
        aria-haspopup="listbox"
        :aria-expanded="open"
        @click="toggle"
      >
        <span>{{ engine.name }}</span>
        <svg
          class="caret"
          viewBox="0 0 12 12"
          width="10"
          height="10"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          aria-hidden="true"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="open" class="backdrop" aria-hidden="true" @click="open = false"></div>
      <ul
        v-if="open"
        class="menu"
        :style="{ left: `${menuPos.left}px`, top: `${menuPos.top}px` }"
        role="listbox"
        aria-label="搜索引擎"
      >
        <li
          v-for="(e, i) in SEARCH_ENGINES"
          :key="e.id"
          role="option"
          :aria-selected="e.id === engine.id"
          :class="{ active: e.id === engine.id, hover: i === highlight }"
          @click="choose(e.id)"
        >
          <span>{{ e.name }}</span>
          <span v-if="e.id === engine.id" class="check">✓</span>
        </li>
      </ul>
    </Teleport>

    <input
      v-model="query"
      class="input"
      type="text"
      autocomplete="off"
      spellcheck="false"
      :placeholder="`在 ${engine.name} 中搜索`"
      aria-label="搜索"
    />
  </form>
</template>

<style scoped>
.search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 560px;
  padding: 6px 6px 6px 8px;
  border-radius: 999px;
  background: var(--hy-glass);
  border: 1px solid var(--hy-glass-border);
  backdrop-filter: blur(14px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
  transition: border-color 0.15s ease;
}

.search:focus-within {
  border-color: var(--hy-accent);
}

.picker {
  position: relative;
}

.engine {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 66px;
  padding: 6px 10px;
  border: none;
  border-radius: 999px;
  background: var(--hy-glass-hover);
  color: var(--hy-on-bg);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.engine:hover {
  background: color-mix(in srgb, var(--hy-on-bg) 16%, transparent);
}

.caret {
  transition: transform 0.15s ease;
}

.engine[aria-expanded='true'] .caret {
  transform: rotate(180deg);
}

.menu {
  position: fixed;
  min-width: 132px;
  margin: 0;
  padding: 6px;
  list-style: none;
  border-radius: 12px;
  background: var(--hy-popover);
  border: 1px solid var(--hy-glass-border);
  backdrop-filter: blur(18px);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.4);
  z-index: 10000;
}

.menu li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--hy-fg);
  cursor: pointer;
}

.menu li.hover {
  background: var(--hy-glass-hover);
}

.menu li.active,
.menu li.active .check {
  color: var(--hy-accent);
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--hy-on-bg);
  font-size: 16px;
  padding: 8px 4px;
  outline: none;
}

.input::placeholder {
  color: var(--hy-on-bg-muted);
}
</style>
