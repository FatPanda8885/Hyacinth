<script setup lang="ts">
import { computed } from 'vue'

import { useConfigStore } from '@/stores/config'
import {
  BACKGROUND_DEFAULTS,
  type BackgroundConfig,
  type BackgroundType,
  PRESET_COLORS,
  PRESET_GRADIENTS,
  backgroundStyleFor,
} from '@/widgets/background'

const store = useConfigStore()
store.ensureWidgetDefaults('background', BACKGROUND_DEFAULTS)

const cfg = computed(() => store.config.widgets.background as BackgroundConfig)
const previewStyle = computed(() => backgroundStyleFor(cfg.value))

const typeLabels: Record<BackgroundType, string> = {
  gradient: '渐变',
  color: '纯色',
  image: '图片',
}

function setType(type: BackgroundType): void {
  const value =
    type === 'gradient' ? PRESET_GRADIENTS[0].value : type === 'color' ? PRESET_COLORS[0].value : ''
  store.updateWidget('background', { type, value })
}

function setValue(value: string): void {
  store.updateWidget('background', { value })
}
</script>

<template>
  <div class="card">
    <div class="row">
      <span>背景类型</span>
      <div class="segment">
        <button
          v-for="(label, type) in typeLabels"
          :key="type"
          type="button"
          :class="{ on: cfg.type === type }"
          @click="setType(type)"
        >
          {{ label }}
        </button>
      </div>
    </div>

    <div v-if="cfg.type === 'gradient'" class="row wrap">
      <span>预设渐变</span>
      <div class="swatches">
        <button
          v-for="p in PRESET_GRADIENTS"
          :key="p.id"
          type="button"
          class="swatch"
          :class="{ on: cfg.value === p.value }"
          :style="{ background: p.value }"
          :title="p.label"
          @click="setValue(p.value)"
        >
          <span v-if="cfg.value === p.value" class="check">✓</span>
        </button>
      </div>
    </div>

    <div v-else-if="cfg.type === 'color'" class="row wrap">
      <span>颜色</span>
      <div class="swatches">
        <button
          v-for="p in PRESET_COLORS"
          :key="p.id"
          type="button"
          class="swatch"
          :class="{ on: cfg.value === p.value }"
          :style="{ background: p.value }"
          :title="p.label"
          @click="setValue(p.value)"
        >
          <span v-if="cfg.value === p.value" class="check">✓</span>
        </button>
        <label class="swatch custom" title="自定义颜色">
          <input
            type="color"
            :value="cfg.value"
            @input="setValue(($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </div>

    <div v-else class="row">
      <label for="bg-url">图片 URL</label>
      <input
        id="bg-url"
        class="url"
        type="url"
        placeholder="https://example.com/wallpaper.jpg"
        :value="cfg.type === 'image' ? cfg.value : ''"
        @change="setValue(($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="preview" :style="previewStyle" aria-hidden="true">
      <span>预览</span>
    </div>
  </div>
</template>

<style scoped>
.card {
  padding: 8px 22px 22px;
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

.row.wrap {
  flex-wrap: wrap;
}

.row > label,
.row > span {
  font-size: 14px;
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

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.swatch {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  display: grid;
  place-items: center;
}

.swatch.on {
  border-color: var(--hy-accent);
}

.swatch.custom {
  background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red);
  overflow: hidden;
}

.swatch.custom input {
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.check {
  color: #fff;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
  font-size: 16px;
}

.url {
  flex: 1;
  max-width: 340px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--hy-border);
  background: var(--hy-bg);
  color: var(--hy-fg);
  font-size: 13px;
}

.preview {
  margin-top: 18px;
  height: 130px;
  border-radius: var(--hy-radius);
  border: 1px solid var(--hy-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview span {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  letter-spacing: 0.3em;
}
</style>
