<script setup lang="ts">
import { computed } from 'vue'

import { useConfigStore } from '@/stores/config'

import { SHORTCUTS_DEFAULTS, type ShortcutsConfig, hostOf, tileColor, tileLabel } from './model'

const store = useConfigStore()
store.ensureWidgetDefaults('shortcuts', SHORTCUTS_DEFAULTS)
const cfg = computed(() => store.config.widgets.shortcuts as ShortcutsConfig)

const links = computed(() => cfg.value.links.filter((l) => l.url.trim()))
</script>

<template>
  <!-- M1 只做展示，磁贴的增删改在设置页；M2 画布编辑模式支持就地编辑 -->
  <nav v-if="links.length" class="shortcuts" aria-label="快捷方式">
    <a
      v-for="link in links"
      :key="link.id"
      class="tile"
      :href="link.url"
      :title="link.title || hostOf(link.url)"
    >
      <span class="avatar" :style="{ background: tileColor(link) }">{{ tileLabel(link) }}</span>
      <span class="label">{{ link.title || hostOf(link.url).replace(/^www\./, '') }}</span>
    </a>
  </nav>
</template>

<style scoped>
.shortcuts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 20px;
  max-width: 100%;
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 76px;
  padding: 10px 4px;
  border-radius: var(--hy-radius);
  text-decoration: none;
  color: rgba(255, 255, 255, 0.85);
  transition: background 0.15s ease;
}

.tile:hover {
  background: rgba(255, 255, 255, 0.08);
}

.avatar {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
}

.label {
  font-size: 12px;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
