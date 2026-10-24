<script setup lang="ts">
import { computed } from 'vue'

import { useConfigStore } from '@/stores/config'
import {
  SHORTCUTS_DEFAULTS,
  type ShortcutLink,
  type ShortcutsConfig,
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
  const target = index + delta
  if (target < 0 || target >= links.value.length) return
  const next = [...links.value]
  ;[next[index], next[target]] = [next[target], next[index]]
  replace(next)
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
</script>

<template>
  <div class="card">
    <p class="tip">拖拽排序与画布内编辑将在 M2 上线，这里先用按钮调序。</p>

    <div v-for="(link, i) in links" :key="link.id" class="link-row">
      <span class="avatar" aria-hidden="true">{{ i + 1 }}</span>
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

.link-row + .link-row {
  border-top: 1px solid var(--hy-border);
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
