<script setup lang="ts">
import { computed, ref } from 'vue'

import { useConfigStore } from '@/stores/config'
import {
  SHORTCUTS_DEFAULTS,
  type ShortcutLink,
  type ShortcutsConfig,
  moveItem,
  newId,
  normalizeUrl,
} from '@/widgets/shortcuts'

const store = useConfigStore()
store.ensureWidgetDefaults('shortcuts', SHORTCUTS_DEFAULTS)

const links = computed(() => (store.config.widgets.shortcuts as ShortcutsConfig).links)

function replace(next: ShortcutLink[]): void {
  store.updateWidget('shortcuts', { links: next })
}

function patchAt(index: number, patch: Partial<ShortcutLink>): void {
  const next = links.value.map((l, i) => (i === index ? { ...l, ...patch } : l))
  replace(next)
}

function removeAt(index: number): void {
  replace(links.value.filter((_, i) => i !== index))
}

function move(index: number, delta: -1 | 1): void {
  replace(moveItem(links.value, index, index + delta))
}

function add(): void {
  replace([...links.value, { id: newId(), title: '', url: '' }])
}

function onTitle(index: number, value: string): void {
  patchAt(index, { title: value })
}

function onUrl(index: number, value: string): void {
  patchAt(index, { url: value })
}

/** 失焦时补全协议，避免每个字符输入都触发规范化 */
function onUrlBlur(index: number, event: FocusEvent): void {
  const input = event.target as HTMLInputElement
  const normalized = normalizeUrl(input.value)
  if (normalized !== input.value) {
    input.value = normalized
    patchAt(index, { url: normalized })
  }
}

// ---- 拖住序号手柄排序：拖动经过目标行即实时换序 ----
const dragIndex = ref<number | null>(null)

function onDragStart(index: number, event: DragEvent): void {
  dragIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(index: number, event: DragEvent): void {
  event.preventDefault()
  if (dragIndex.value === null || dragIndex.value === index) return
  replace(moveItem(links.value, dragIndex.value, index))
  dragIndex.value = index
}

function onDragEnd(): void {
  dragIndex.value = null
}
</script>

<template>
  <div class="card">
    <p class="tip">
      拖住行首序号即可排序（上下按钮也可用）；画布上挂件的摆放在新标签页「编辑布局」里拖拽。
    </p>

    <!-- TransitionGroup 的 FLIP 动画：换序时行平滑滑动到位，新增淡入、删除淡出 -->
    <TransitionGroup name="reorder" tag="div" class="rows">
      <div
        v-for="(link, i) in links"
        :key="link.id"
        class="link-row"
        :class="{ dragging: dragIndex === i }"
        @dragover="onDragOver(i, $event)"
      >
        <span
          class="avatar handle"
          draggable="true"
          title="拖动排序"
          aria-hidden="true"
          @dragstart="onDragStart(i, $event)"
          @dragend="onDragEnd"
        >
          {{ i + 1 }}
        </span>
        <input
          class="title"
          type="text"
          placeholder="名称"
          :value="link.title"
          @input="onTitle(i, ($event.target as HTMLInputElement).value)"
        />
        <input
          class="url"
          type="text"
          placeholder="网址，如 github.com"
          :value="link.url"
          @input="onUrl(i, ($event.target as HTMLInputElement).value)"
          @blur="onUrlBlur(i, $event)"
        />
        <div class="ops">
          <button type="button" title="上移" :disabled="i === 0" @click="move(i, -1)">↑</button>
          <button type="button" title="下移" :disabled="i === links.length - 1" @click="move(i, 1)">
            ↓
          </button>
          <button type="button" title="删除" class="danger" @click="removeAt(i)">✕</button>
        </div>
      </div>
    </TransitionGroup>

    <button class="add" type="button" @click="add">＋ 添加快捷方式</button>
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

.link-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

/* FLIP 换序滑动 + 新增/删除的进出场 */
.rows {
  position: relative;
}

.reorder-move {
  transition: transform 0.25s ease;
}

.reorder-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.reorder-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

/* 删除行脱流出局，其余行滑动补位 */
.reorder-leave-active {
  transition: opacity 0.18s ease;
  position: absolute;
  left: 0;
  width: 100%;
}

.reorder-leave-to {
  opacity: 0;
}

.link-row + .link-row {
  border-top: 1px solid var(--hy-border);
}

.link-row.dragging {
  opacity: 0.55;
}

.avatar {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--hy-accent-soft);
  color: var(--hy-accent);
  font-size: 12px;
  flex-shrink: 0;
}

.avatar.handle {
  cursor: grab;
  user-select: none;
}

.avatar.handle:active {
  cursor: grabbing;
}

input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--hy-border);
  background: var(--hy-bg);
  color: var(--hy-fg);
  font-size: 13px;
  outline: none;
}

input:focus {
  border-color: var(--hy-accent);
}

.title {
  width: 150px;
}

.url {
  flex: 1;
  min-width: 0;
}

.ops {
  display: flex;
  gap: 4px;
}

.ops button {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--hy-fg-muted);
  font-size: 14px;
  cursor: pointer;
}

.ops button:hover:not(:disabled) {
  background: var(--hy-accent-soft);
  color: var(--hy-fg);
}

.ops button:disabled {
  opacity: 0.3;
  cursor: default;
}

.ops button.danger:hover {
  background: rgba(229, 72, 77, 0.16);
  color: #e5484d;
}

.add {
  margin-top: 14px;
  width: 100%;
  padding: 10px;
  border: 1px dashed var(--hy-border);
  border-radius: 8px;
  background: transparent;
  color: var(--hy-fg-muted);
  font-size: 13px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.add:hover {
  border-color: var(--hy-accent);
  color: var(--hy-accent);
}
</style>
