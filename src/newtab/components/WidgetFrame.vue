<script setup lang="ts">
import { computed } from 'vue'

import { HANDLES, pctStyle, type Handle } from '@/core/layout/grid'
import type { Slot } from '@/shared/types'

const props = defineProps<{
  slotData: Slot
  selected: boolean
  editing: boolean
}>()

const emit = defineEmits<{
  (e: 'interact', ev: PointerEvent, handle?: Handle): void
  (e: 'to-front'): void
  (e: 'to-back'): void
  (e: 'remove'): void
}>()

const style = computed(() => ({ ...pctStyle(props.slotData), zIndex: props.slotData.z }))

function down(ev: PointerEvent, handle?: Handle): void {
  emit('interact', ev, handle)
}
</script>

<template>
  <div class="frame" :class="{ selected, editing }" :style="style" @pointerdown="down($event)">
    <div class="content">
      <slot />
    </div>

    <template v-if="editing">
      <!-- 编辑模式下的浮动操作条 -->
      <div v-if="selected" class="toolbar" @pointerdown.stop>
        <button type="button" title="置顶" aria-label="置顶" @click="emit('to-front')">⬆</button>
        <button type="button" title="置底" aria-label="置底" @click="emit('to-back')">⬇</button>
        <button
          type="button"
          title="移除挂件"
          aria-label="移除挂件"
          class="danger"
          @click="emit('remove')"
        >
          ✕
        </button>
      </div>
      <!-- 缩放手柄 -->
      <div
        v-for="h in HANDLES"
        :key="h"
        class="handle"
        :class="h"
        @pointerdown.stop.prevent="down($event, h)"
      ></div>
    </template>
  </div>
</template>

<style scoped>
.frame {
  position: absolute;
  touch-action: none;
}

.frame.editing {
  cursor: move;
  outline: 1px dashed rgba(255, 255, 255, 0.22);
  outline-offset: -1px;
  border-radius: 10px;
}

.frame.editing:hover {
  outline-color: rgba(255, 255, 255, 0.45);
}

.frame.selected {
  outline: 1.5px solid var(--hy-accent) !important;
  outline-offset: -1px;
  border-radius: 10px;
}

.content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.frame.editing .content {
  pointer-events: none;
  opacity: 0.92;
}

.toolbar {
  position: absolute;
  top: -38px;
  right: -1px;
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: rgba(16, 16, 20, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(12px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  z-index: 1;
}

.toolbar button {
  width: 28px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  cursor: pointer;
}

.toolbar button:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.toolbar button.danger:hover {
  background: rgba(229, 72, 77, 0.18);
  color: #e5484d;
}

.handle {
  position: absolute;
  background: var(--hy-accent);
  border: 1.5px solid #fff;
  border-radius: 2px;
  z-index: 1;
}

.handle.nw,
.handle.ne,
.handle.sw,
.handle.se {
  width: 11px;
  height: 11px;
}

.handle.n,
.handle.s {
  width: 22px;
  height: 7px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 4px;
}

.handle.e,
.handle.w {
  width: 7px;
  height: 22px;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 4px;
}

.handle.nw {
  top: -6px;
  left: -6px;
  cursor: nwse-resize;
}

.handle.n {
  top: -5px;
  cursor: ns-resize;
}

.handle.ne {
  top: -6px;
  right: -6px;
  cursor: nesw-resize;
}

.handle.e {
  right: -5px;
  cursor: ew-resize;
}

.handle.se {
  bottom: -6px;
  right: -6px;
  cursor: nwse-resize;
}

.handle.s {
  bottom: -5px;
  cursor: ns-resize;
}

.handle.sw {
  bottom: -6px;
  left: -6px;
  cursor: nesw-resize;
}

.handle.w {
  left: -5px;
  cursor: ew-resize;
}
</style>
