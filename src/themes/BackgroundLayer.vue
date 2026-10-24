<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { getAsset } from '@/platform/assetStore'
import type { BackgroundEffects, ThemeBackground } from '@/shared/types'
import {
  BACKGROUND_DEFAULTS,
  assetRefToId,
  backgroundStyleFor,
  isAssetRef,
} from '@/widgets/background'

import { normalizeEffects } from './apply'

const props = defineProps<{
  background: ThemeBackground
  /** 背景显示效果（模糊/亮度） */
  effects?: BackgroundEffects
  /** true = fixed 铺满视口（新标签页）；缺省 = 填充定位父级（设置页预览） */
  viewport?: boolean
}>()

/** 异步解析后的背景样式；asset: 引用需先从 IndexedDB 取 Blob 换 object URL */
const style = ref<{ background: string; backgroundColor: string }>(
  backgroundStyleFor(props.background),
)

let objectUrl: string | null = null
let requestSeq = 0

const eff = computed(() => normalizeEffects(props.effects))

/**
 * 内衬层样式：模糊会让边缘露出透明，按 blur 半径外扩 inset（约 3 倍扩散），
 * 外层 overflow:hidden 裁剪，任何模糊度下都铺满不留边。
 */
const innerStyle = computed(() => ({
  ...style.value,
  inset: `${-eff.value.blur * 3}px`,
  filter: `blur(${eff.value.blur}px) brightness(${eff.value.brightness}%)`,
}))

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
  <div class="bg" :class="{ viewport }" aria-hidden="true">
    <div class="inner" :style="innerStyle"></div>
  </div>
</template>

<style scoped>
.bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.bg.viewport {
  position: fixed;
  z-index: -1;
}

.inner {
  position: absolute;
  transition: filter 0.15s ease;
}
</style>
