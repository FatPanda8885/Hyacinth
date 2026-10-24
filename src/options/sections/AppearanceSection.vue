<script setup lang="ts">
import { computed, ref } from 'vue'

import { useConfigStore } from '@/stores/config'
import type { ThemeBackground, ThemeDefinition } from '@/shared/types'
import { BUILTIN_THEMES } from '@/themes/builtin'
import { exportTheme, findTheme, validateTheme } from '@/themes/apply'
import { useTheme } from '@/themes/useTheme'
import {
  type BackgroundType,
  PRESET_COLORS,
  PRESET_GRADIENTS,
  backgroundStyleFor,
} from '@/widgets/background'

const store = useConfigStore()
const theme = useTheme() // 本页实时预览主题应用效果

const allThemes = computed<ThemeDefinition[]>(() => [
  ...BUILTIN_THEMES,
  ...store.config.customThemes,
])
const activeId = computed(() => store.config.theme.id)

function previewStyle(def: ThemeDefinition): string {
  return def.background ? backgroundStyleFor(def.background).background : 'var(--hy-bg)'
}

function swatches(def: ThemeDefinition): string[] {
  const v = def.variables
  return [v['--hy-bg'] ?? '#101014', v['--hy-bg-soft'] ?? '#1a1a21', v['--hy-accent'] ?? '#8b7cf8']
}

// ---- 背景覆盖（叠加在主题之上） ----
const override = computed(() => store.config.theme.background)
const activeDef = computed(() => findTheme(activeId.value, store.config.customThemes))

/** 展示值 = 用户覆盖 ?? 主题自带；编辑时总是写入覆盖 */
const bgValue = computed<ThemeBackground>(
  () => override.value ?? activeDef.value?.background ?? { type: 'gradient', value: '' },
)

const typeLabels: Record<BackgroundType, string> = {
  gradient: '渐变',
  color: '纯色',
  image: '图片',
}

function setType(type: BackgroundType): void {
  const value =
    type === 'gradient' ? PRESET_GRADIENTS[0].value : type === 'color' ? PRESET_COLORS[0].value : ''
  store.setBackgroundOverride({ type, value })
}

function setValue(value: string): void {
  store.setBackgroundOverride({ type: bgValue.value.type, value })
}

// ---- 导入 / 导出 ----
const importError = ref('')

function exportCurrent(): void {
  const def = activeDef.value
  if (!def) return
  const json = exportTheme(def, store.config.theme.variables)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hyacinth-theme-${def.id}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function onImportFile(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const result = validateTheme(JSON.parse(String(reader.result)))
      if (!result.ok) {
        importError.value = result.error
        return
      }
      store.upsertCustomTheme(result.theme)
      store.setThemeId(result.theme.id)
      importError.value = ''
    } catch {
      importError.value = '无法解析文件，请确认是 Hyacinth 主题 JSON'
    }
  }
  reader.readAsText(file)
}

const previewStripStyle = computed(() => backgroundStyleFor(theme.value.background))
</script>

<template>
  <div class="card stack">
    <!-- 主题选择 -->
    <div class="row">
      <span>主题</span>
      <div class="themes">
        <div
          v-for="t in allThemes"
          :key="t.id"
          class="theme-card"
          :class="{ active: t.id === activeId }"
          role="button"
          tabindex="0"
          @click="store.setThemeId(t.id)"
          @keydown.enter="store.setThemeId(t.id)"
        >
          <div class="theme-preview" :style="{ background: previewStyle(t) }">
            <span
              v-for="(c, i) in swatches(t)"
              :key="i"
              class="dot"
              :style="{ background: c }"
            ></span>
          </div>
          <div class="theme-name">
            {{ t.name }}
            <button
              v-if="!BUILTIN_THEMES.some((b) => b.id === t.id)"
              type="button"
              class="del"
              title="删除此自定义主题"
              aria-label="删除此自定义主题"
              @click.stop="store.removeCustomTheme(t.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 背景覆盖 -->
    <div class="row wrap">
      <span>
        背景自定义
        <em v-if="override" class="badge">已覆盖主题</em>
      </span>
      <div class="bg-controls">
        <button
          v-if="override"
          type="button"
          class="follow"
          @click="store.setBackgroundOverride(undefined)"
        >
          跟随主题
        </button>
        <div class="segment">
          <button
            v-for="(label, type) in typeLabels"
            :key="type"
            type="button"
            :class="{ on: bgValue.type === type }"
            @click="setType(type)"
          >
            {{ label }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="bgValue.type === 'gradient'" class="row wrap">
      <span>预设渐变</span>
      <div class="swatches">
        <button
          v-for="p in PRESET_GRADIENTS"
          :key="p.id"
          type="button"
          class="swatch"
          :class="{ on: bgValue.value === p.value }"
          :style="{ background: p.value }"
          :title="p.label"
          @click="setValue(p.value)"
        >
          <span v-if="bgValue.value === p.value" class="check">✓</span>
        </button>
      </div>
    </div>

    <div v-else-if="bgValue.type === 'color'" class="row wrap">
      <span>颜色</span>
      <div class="swatches">
        <button
          v-for="p in PRESET_COLORS"
          :key="p.id"
          type="button"
          class="swatch"
          :class="{ on: bgValue.value === p.value }"
          :style="{ background: p.value }"
          :title="p.label"
          @click="setValue(p.value)"
        >
          <span v-if="bgValue.value === p.value" class="check">✓</span>
        </button>
        <label class="swatch custom" title="自定义颜色">
          <input
            type="color"
            :value="bgValue.value"
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
        :value="bgValue.type === 'image' ? bgValue.value : ''"
        @change="setValue(($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- 导入导出 -->
    <div class="row">
      <span>分享主题</span>
      <div class="io">
        <button type="button" class="ghost-btn" @click="exportCurrent">导出当前主题</button>
        <label class="ghost-btn file">
          导入主题
          <input type="file" accept="application/json,.json" @change="onImportFile" />
        </label>
      </div>
    </div>
    <p v-if="importError" class="error" role="alert">{{ importError }}</p>

    <div class="preview" :style="previewStripStyle" aria-hidden="true">
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

.stack > .row + .row {
  border-top: 1px solid var(--hy-border);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 13px 0;
}

.row.wrap {
  flex-wrap: wrap;
}

.row > label,
.row > span {
  font-size: 14px;
}

.badge {
  font-style: normal;
  font-size: 11px;
  color: var(--hy-accent);
  border: 1px solid var(--hy-accent-soft);
  background: var(--hy-accent-soft);
  border-radius: 999px;
  padding: 1px 8px;
  margin-left: 6px;
}

/* 主题卡片 */
.themes {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
}

.theme-card {
  width: 118px;
  border: 2px solid var(--hy-border);
  border-radius: var(--hy-radius);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.theme-card:hover {
  border-color: var(--hy-fg-muted);
}

.theme-card.active {
  border-color: var(--hy-accent);
}

.theme-preview {
  position: relative;
  height: 58px;
  display: flex;
  align-items: flex-end;
  gap: 5px;
  padding: 7px;
}

.dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 1px solid rgba(127, 127, 127, 0.4);
}

.theme-name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 4px;
  font-size: 13px;
  color: var(--hy-fg);
  background: var(--hy-bg);
}

.del {
  border: none;
  background: transparent;
  color: var(--hy-fg-muted);
  font-size: 11px;
  cursor: pointer;
  padding: 0 3px;
}

.del:hover {
  color: #e5484d;
}

/* 背景控件 */
.bg-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.follow {
  border: 1px solid var(--hy-accent-soft);
  background: var(--hy-accent-soft);
  color: var(--hy-accent);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 12px;
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

/* 导入导出 */
.io {
  display: flex;
  gap: 10px;
}

.ghost-btn {
  border: 1px solid var(--hy-border);
  background: transparent;
  color: var(--hy-fg);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}

.ghost-btn:hover {
  border-color: var(--hy-accent);
  color: var(--hy-accent);
}

.file {
  position: relative;
  overflow: hidden;
}

.file input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.error {
  margin: 0;
  color: #e5484d;
  font-size: 13px;
}

.preview {
  margin-top: 18px;
  height: 110px;
  border-radius: var(--hy-radius);
  border: 1px solid var(--hy-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview span {
  color: rgba(127, 127, 127, 0.8);
  font-size: 12px;
  letter-spacing: 0.3em;
}
</style>
