<script setup lang="ts">
import { computed } from 'vue'

import { useConfigStore } from '@/stores/config'
import { CLOCK_DEFAULTS, type ClockConfig } from '@/widgets/clock'
import { SEARCH_DEFAULTS, SEARCH_ENGINES, type SearchConfig } from '@/widgets/search'

const store = useConfigStore()
store.ensureWidgetDefaults('clock', CLOCK_DEFAULTS)
store.ensureWidgetDefaults('search', SEARCH_DEFAULTS)

const clock = computed(() => store.config.widgets.clock as ClockConfig)
const search = computed(() => store.config.widgets.search as SearchConfig)

function setClock(patch: Partial<ClockConfig>): void {
  store.updateWidget('clock', patch)
}
</script>

<template>
  <div class="card">
    <div class="row">
      <label for="engine">默认搜索引擎</label>
      <select
        id="engine"
        :value="search.engine"
        @change="
          store.updateWidget('search', { engine: ($event.target as HTMLSelectElement).value })
        "
      >
        <option v-for="e in SEARCH_ENGINES" :key="e.id" :value="e.id">{{ e.name }}</option>
      </select>
    </div>

    <div class="row">
      <span>时钟样式</span>
      <div class="segment">
        <button
          type="button"
          :class="{ on: clock.mode === 'digital' }"
          @click="setClock({ mode: 'digital' })"
        >
          数字
        </button>
        <button
          type="button"
          :class="{ on: clock.mode === 'analog' }"
          @click="setClock({ mode: 'analog' })"
        >
          表盘
        </button>
      </div>
    </div>

    <div class="row">
      <label for="hour24">24 小时制</label>
      <input
        id="hour24"
        type="checkbox"
        :checked="clock.hour24"
        @change="setClock({ hour24: ($event.target as HTMLInputElement).checked })"
      />
    </div>

    <div class="row">
      <label for="seconds">显示秒{{ clock.mode === 'analog' ? '针' : '' }}</label>
      <input
        id="seconds"
        type="checkbox"
        :checked="clock.showSeconds"
        @change="setClock({ showSeconds: ($event.target as HTMLInputElement).checked })"
      />
    </div>

    <div class="row">
      <label for="date">显示日期</label>
      <input
        id="date"
        type="checkbox"
        :checked="clock.showDate"
        @change="setClock({ showDate: ($event.target as HTMLInputElement).checked })"
      />
    </div>
  </div>
</template>

<style scoped>
.card {
  padding: 8px 22px;
  border: 1px solid var(--hy-border);
  border-radius: var(--hy-radius);
  background: var(--hy-bg-soft);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 13px 0;
}

.row + .row {
  border-top: 1px solid var(--hy-border);
}

.row > label,
.row > span {
  font-size: 14px;
  color: var(--hy-fg);
}

select {
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--hy-border);
  background: var(--hy-bg);
  color: var(--hy-fg);
  font-size: 14px;
  cursor: pointer;
}

.segment {
  display: flex;
  border: 1px solid var(--hy-border);
  border-radius: 8px;
  overflow: hidden;
}

.segment button {
  padding: 7px 16px;
  border: none;
  background: transparent;
  color: var(--hy-fg-muted);
  font-size: 13px;
  cursor: pointer;
}

.segment button.on {
  background: var(--hy-accent-soft);
  color: var(--hy-fg);
}

input[type='checkbox'] {
  width: 17px;
  height: 17px;
  accent-color: var(--hy-accent);
  cursor: pointer;
}
</style>
