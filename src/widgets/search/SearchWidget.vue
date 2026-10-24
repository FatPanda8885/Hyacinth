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
</script>

<template>
  <form class="search" @submit.prevent="go">
    <select v-model="engineId" class="engine" aria-label="搜索引擎">
      <option v-for="e in SEARCH_ENGINES" :key="e.id" :value="e.id">{{ e.name }}</option>
    </select>
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
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(560px, 86vw);
  padding: 6px 6px 6px 10px;
  border-radius: 999px;
  background: rgba(16, 16, 20, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(14px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
  transition: border-color 0.15s ease;
}

.search:focus-within {
  border-color: var(--hy-accent);
}

.engine {
  appearance: none;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 13px;
  padding: 6px 10px;
  cursor: pointer;
  outline: none;
}

.engine option {
  color: #111;
}

.input {
  flex: 1;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 16px;
  padding: 8px 4px;
  outline: none;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.45);
}
</style>
