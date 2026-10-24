<script setup lang="ts">
import { onMounted } from 'vue'

import { openOptionsPage } from '@/platform/runtime'
import { useConfigStore } from '@/stores/config'
import BackgroundLayer from '@/themes/BackgroundLayer.vue'
import { useTheme } from '@/themes/useTheme'

import CanvasStage from './components/CanvasStage.vue'

const store = useConfigStore()
const { theme, effects } = useTheme()

onMounted(() => void store.init())
</script>

<template>
  <BackgroundLayer :background="theme.background" :effects="effects" viewport />

  <CanvasStage />

  <button
    class="settings"
    type="button"
    title="打开设置"
    aria-label="打开设置"
    @click="openOptionsPage"
  >
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.2" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03z"
      />
    </svg>
  </button>
</template>

<style scoped>
.settings {
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: var(--hy-glass);
  color: var(--hy-on-bg-muted);
  cursor: pointer;
  opacity: 0.4;
  transition:
    opacity 0.15s ease,
    color 0.15s ease;
  z-index: 9998;
}

.settings:hover,
.settings:focus-visible {
  opacity: 1;
  color: var(--hy-on-bg);
}
</style>
