<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

import { getAsset } from '@/platform/assetStore'
import type { ThemeBackground } from '@/shared/types'
import {
  BACKGROUND_DEFAULTS,
  assetRefToId,
  backgroundStyleFor,
  isAssetRef,
} from '@/widgets/background'

const props = defineProps<{
  background: ThemeBackground
  /** true = fixed 铺满视口（新标签页）；缺省 = 填充定位父级（设置页预览） */
  viewport?: boolean
}>()

/** 异步解析后的背景样式；asset: 引用需先从 IndexedDB 取 Blob 换 object URL */
const style = ref<{ background: string; backgroundColor: string }>(
  backgroundStyleFor(props.background),
)

let objectUrl: string | null = null
let requestSeq = 0

async function resolve(bg: ThemeBackground): Promise<void> {
  const seq = ++requestSeq
  if (bg.type !== 'image' || !isAssetRef(bg.value)) {
    apply(backgroundStyleFor(bg), seq)
    return
  }
  try {
    const blob = await getAsset(assetRefToId(bg.value))
    if (seq !== requestSeq) return // 已被更新的解析请求取代
    if (!blob) {
      // 资产丢失（被清理/换设备）：回退默认背景
      apply(backgroundStyleFor(BACKGROUND_DEFAULTS), seq)
      return
    }
    const url = URL.createObjectURL(blob)
    apply({ background: `url("${url}") center / cover no-repeat`, backgroundColor: '#101014' }, seq)
  } catch {
    if (seq === requestSeq) apply(backgroundStyleFor(BACKGROUND_DEFAULTS), seq)
  }
}

function apply(next: { background: string; backgroundColor: string }, seq: number): void {
  if (seq !== requestSeq) return
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
  if (next.background.startsWith('url("blob:')) {
    objectUrl = next.background.slice(5, next.background.indexOf('"', 5))
  }
  style.value = next
}

watch(
  () => props.background,
  (bg) => void resolve(bg),
  { immediate: true },
)

onBeforeUnmount(() => {
  requestSeq++
  if (objectUrl) URL.revokeObjectURL(objectUrl)
})
</script>

<template>
  <div class="bg" :class="{ viewport }" :style="style" aria-hidden="true"></div>
</template>

<style scoped>
.bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  transition: background 0.4s ease;
}

.bg.viewport {
  position: fixed;
  z-index: -1;
}
</style>
