<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  COLS,
  ROWS,
  moveSlot,
  resizeSlot,
  snapToCenters,
  type GridSlot,
  type Handle,
} from '@/core/layout/grid'
import {
  bringToFront,
  findAddPosition,
  patchSlot,
  removeSlot,
  sendToBack,
  topZ,
} from '@/core/layout/slots'
import { newId } from '@/shared/id'
import type { Slot } from '@/shared/types'
import { parsePluginWidgetType, pluginWidgetType, resolvePluginEntry } from '@/plugins/catalog'
import { useConfigStore } from '@/stores/config'
import { getWidget, listWidgets } from '@/widgets'
import PluginWidget from '@/widgets/plugin/PluginWidget.vue'
import type { WidgetConstraints } from '@/widgets/registry'

import WidgetFrame from './WidgetFrame.vue'

const store = useConfigStore()

const editing = ref(false)
const selectedId = ref<string | null>(null)
const addOpen = ref(false)

/** 添加菜单目录：内置挂件 + 已启用的插件 */
interface AddEntry {
  type: string
  name: string
  constraints: WidgetConstraints
}

const addEntries = computed<AddEntry[]>(() => {
  const builtins: AddEntry[] = listWidgets().map((w) => ({
    type: w.type,
    name: w.name,
    constraints: w.constraints,
  }))
  // 已启用的插件（内置或市场/URL 安装的远程插件统一解析）
  const enabledPlugins = store.config.plugins
    .filter((p) => p.enabled)
    .map((p) => resolvePluginEntry(p.id, p))
    .filter((e) => e !== undefined)
    .map((e) => ({
      type: pluginWidgetType(e.id),
      name: `${e.name} · 插件`,
      constraints: e.constraints,
    }))
  return [...builtins, ...enabledPlugins]
})

/** 槽位类型的尺寸约束（内置挂件或插件解析结果） */
function constraintsOf(type: string): WidgetConstraints {
  const builtin = getWidget(type)?.constraints
  if (builtin) return builtin
  const pluginId = parsePluginWidgetType(type)
  if (!pluginId) return { minW: 3, minH: 2, defaultW: 6, defaultH: 4 }
  const installed = store.config.plugins.find((p) => p.id === pluginId)
  return (
    resolvePluginEntry(pluginId, installed)?.constraints ?? {
      minW: 3,
      minH: 2,
      defaultW: 6,
      defaultH: 4,
    }
  )
}

/** 舞台实际尺寸（ResizeObserver 维护），用于 px ↔ 网格单位换算 */
const stageRef = ref<HTMLElement | null>(null)
const size = ref({ w: 0, h: 0 })
let observer: ResizeObserver | undefined

/** 拖拽/缩放中的本地覆盖：rAF 更新、pointerup 才提交进 store（大纲 4.1 性能要求） */
const drag = ref<{ id: string; slot: GridSlot; guideV: boolean; guideH: boolean } | null>(null)

const renderSlots = computed(() =>
  store.config.slots.map((s) => (drag.value?.id === s.id ? { ...s, ...drag.value.slot } : s)),
)

const cellW = computed(() => size.value.w / COLS)
const cellH = computed(() => size.value.h / ROWS)

/** 编辑模式的网格底纹 */
const gridStyle = computed(() => {
  if (!editing.value || !cellW.value || !cellH.value) return undefined
  const line = 'rgba(255, 255, 255, 0.05) 1px, transparent 1px'
  return {
    backgroundImage: `linear-gradient(to right, ${line}), linear-gradient(to bottom, ${line})`,
    backgroundSize: `${cellW.value}px ${cellH.value}px`,
  }
})

function startEdit(): void {
  editing.value = true
}

function endEdit(): void {
  editing.value = false
  selectedId.value = null
  addOpen.value = false
}

function onStageDown(e: PointerEvent): void {
  if (!editing.value) return
  if (e.target === stageRef.value) selectedId.value = null
}

/** 拖拽/缩放统一入口：编辑模式下按住即选中置顶，移动结束后一次提交 */
function onInteract(e: PointerEvent, slot: Slot, handle?: Handle): void {
  if (!editing.value) return
  e.preventDefault()
  selectedId.value = slot.id
  addOpen.value = false

  const slots = bringToFront(store.config.slots, slot.id)
  store.setSlots(slots)
  const base = slots.find((s) => s.id === slot.id)
  if (!base) return

  const constraints = constraintsOf(base.widget)
  const min = { w: constraints.minW, h: constraints.minH }
  const baseGeo: GridSlot = { x: base.x, y: base.y, w: base.w, h: base.h }
  const startX = e.clientX
  const startY = e.clientY
  const cw = cellW.value || 1
  const ch = cellH.value || 1
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)

  let raf = 0
  const onMove = (ev: PointerEvent): void => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const dx = (ev.clientX - startX) / cw
      const dy = (ev.clientY - startY) / ch
      const next = handle ? resizeSlot(baseGeo, handle, dx, dy, min) : moveSlot(baseGeo, dx, dy)
      const snapped = snapToCenters(next)
      drag.value = {
        id: slot.id,
        slot: snapped.slot,
        guideV: snapped.guideV,
        guideH: snapped.guideH,
      }
    })
  }
  const finish = (ev: PointerEvent): void => {
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', finish)
    target.removeEventListener('pointercancel', finish)
    if (raf) cancelAnimationFrame(raf)
    if (drag.value) {
      const { id, slot: geo } = drag.value
      store.setSlots(patchSlot(store.config.slots, id, geo))
      drag.value = null
    }
    target.releasePointerCapture(ev.pointerId)
  }
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', finish)
  target.addEventListener('pointercancel', finish)
}

function addWidget(type: string): void {
  const constraints = constraintsOf(type)
  const pos = findAddPosition(store.config.slots, constraints.defaultW, constraints.defaultH)
  const slot: Slot = {
    id: `slot-${type}-${newId().slice(0, 8)}`,
    widget: type,
    x: pos.x,
    y: pos.y,
    w: constraints.defaultW,
    h: constraints.defaultH,
    z: topZ(store.config.slots) + 1,
  }
  store.setSlots([...store.config.slots, slot])
  selectedId.value = slot.id
  addOpen.value = false
}

function act(id: string, action: 'front' | 'back' | 'remove'): void {
  if (action === 'front') store.setSlots(bringToFront(store.config.slots, id))
  if (action === 'back') store.setSlots(sendToBack(store.config.slots, id))
  if (action === 'remove') {
    store.setSlots(removeSlot(store.config.slots, id))
    if (selectedId.value === id) selectedId.value = null
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && editing.value) endEdit()
}

onMounted(() => {
  observer = new ResizeObserver((entries) => {
    const rect = entries[0].contentRect
    size.value = { w: rect.width, h: rect.height }
  })
  if (stageRef.value) observer.observe(stageRef.value)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <section
    ref="stageRef"
    class="stage"
    :class="{ editing }"
    :style="gridStyle"
    @pointerdown="onStageDown"
  >
    <!-- 中心对齐参考线 -->
    <div v-show="editing" class="guides" aria-hidden="true">
      <div v-show="drag?.guideV" class="guide v"></div>
      <div v-show="drag?.guideH" class="guide h"></div>
    </div>

    <WidgetFrame
      v-for="s in renderSlots"
      :key="s.id"
      :slot-data="s"
      :selected="selectedId === s.id"
      :editing="editing"
      @interact="(ev, handle) => onInteract(ev, s, handle)"
      @to-front="act(s.id, 'front')"
      @to-back="act(s.id, 'back')"
      @remove="act(s.id, 'remove')"
    >
      <PluginWidget
        v-if="parsePluginWidgetType(s.widget)"
        :plugin-id="parsePluginWidgetType(s.widget)!"
        :slot-id="s.id"
      />
      <component :is="getWidget(s.widget)?.component" v-else />
    </WidgetFrame>

    <div v-if="store.loaded && renderSlots.length === 0" class="empty">
      <p>画布还是空的</p>
      <button type="button" class="primary" @click="editing = true">进入编辑模式添加挂件</button>
    </div>

    <button
      v-if="!editing"
      class="fab edit-entry"
      type="button"
      title="编辑布局"
      aria-label="编辑布局"
      @click="startEdit"
    >
      <svg
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    </button>

    <div v-else class="edit-bar">
      <div class="add-wrap">
        <button type="button" @click="addOpen = !addOpen">＋ 添加挂件</button>
        <ul v-if="addOpen" class="add-menu" role="listbox" aria-label="挂件目录">
          <li v-for="w in addEntries" :key="w.type" role="option" @click="addWidget(w.type)">
            {{ w.name }}
          </li>
        </ul>
      </div>
      <button type="button" class="done" @click="endEdit">完成</button>
    </div>
  </section>
</template>

<style scoped>
.stage {
  position: relative;
  min-height: 100vh;
  width: 100%;
}

.stage.editing {
  cursor: default;
}

.guides {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
}

.guide {
  position: absolute;
  background: var(--hy-accent);
  opacity: 0.8;
}

.guide.v {
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
}

.guide.h {
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
}

.empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.empty p {
  margin: 0;
  font-size: 15px;
}

.primary {
  padding: 9px 20px;
  border: none;
  border-radius: 999px;
  background: var(--hy-accent);
  color: var(--hy-on-bg);
  font-size: 14px;
  cursor: pointer;
}

.fab {
  position: fixed;
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
}

.fab:hover,
.fab:focus-visible {
  opacity: 1;
  color: var(--hy-on-bg);
}

.edit-entry {
  right: 64px;
  bottom: 18px;
}

.edit-bar {
  position: fixed;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(16, 16, 20, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(16px);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.4);
  z-index: 9999;
}

.edit-bar button {
  padding: 8px 18px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  cursor: pointer;
}

.edit-bar button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.edit-bar .done {
  background: var(--hy-accent-soft);
  color: var(--hy-accent);
}

.add-wrap {
  position: relative;
}

.add-menu {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  margin: 0;
  padding: 6px;
  list-style: none;
  min-width: 120px;
  border-radius: 12px;
  background: rgba(16, 16, 20, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(18px);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.4);
}

.add-menu li {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
}

.add-menu li:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>
