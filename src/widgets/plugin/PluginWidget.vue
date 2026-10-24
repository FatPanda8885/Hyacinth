<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { clampSlot } from '@/core/layout/grid'
import { patchSlot } from '@/core/layout/slots'
import { PluginHostController, type HostServices } from '@/core/plugins/host'
import { extensionUrl, openOptionsPage } from '@/platform/runtime'
import { pluginStorageNamespace, resolvePluginEntry } from '@/plugins/catalog'
import { useConfigStore } from '@/stores/config'
import { useTheme } from '@/themes/useTheme'

const props = defineProps<{
  pluginId: string
  /** 宿主所在槽位 id，layout.resize 需要 */
  slotId: string
}>()

const store = useConfigStore()
const { theme } = useTheme()

const installed = computed(
  () => store.config.plugins.find((p) => p.id === props.pluginId) ?? undefined,
)
const entry = computed(() => resolvePluginEntry(props.pluginId, installed.value))
const enabled = computed(() => installed.value?.enabled === true)

/** 远程插件 entry 是 http(s) URL，内置插件是扩展内路径 */
const src = computed(() => {
  const e = entry.value
  if (!e) return null
  return /^https?:\/\//i.test(e.entry) ? e.entry : extensionUrl(e.entry)
})

const iframeRef = ref<HTMLIFrameElement | null>(null)
let controller: PluginHostController | null = null
const frameLoaded = ref(false)

watch(src, () => {
  frameLoaded.value = false
})

function onWindowMessage(event: MessageEvent): void {
  if (!iframeRef.value || event.source !== iframeRef.value.contentWindow) return
  controller?.onMessage(event.data)
}

/** 握手就绪后建立宿主控制器（安装记录/启用状态异步就位时也会走到） */
function start(): void {
  if (controller || !entry.value) return
  const e = entry.value
  const ns = pluginStorageNamespace(props.pluginId)
  const services: HostServices = {
    storageGet: async (key) => (store.config.widgets[ns] ?? {})[key],
    storageSet: async (key, value) => store.updateWidget(ns, { [key]: value }),
    storageRemove: async (key) => {
      const next = { ...(store.config.widgets[ns] ?? {}) }
      delete next[key]
      store.setWidgetConfig(ns, next)
    },
    getTheme: () => theme.value.variables,
    resizeSlot: async (w, h) => {
      const slot = store.config.slots.find((s) => s.id === props.slotId)
      if (!slot) return false
      const geo = clampSlot({
        x: slot.x,
        y: slot.y,
        w: Math.max(w, e.constraints.minW),
        h: Math.max(h, e.constraints.minH),
      })
      store.setSlots(patchSlot(store.config.slots, props.slotId, geo))
      return true
    },
    openSettings: () => openOptionsPage(),
    proxyFetch: async (url) => {
      const res = await fetch(url, { credentials: 'omit' })
      const body = await res.text()
      return { status: res.status, body: body.slice(0, 200_000) }
    },
  }

  controller = new PluginHostController({
    pluginId: props.pluginId,
    permissions: [...e.permissions],
    services,
    post: (message) => iframeRef.value?.contentWindow?.postMessage(message, '*'),
  })
  window.addEventListener('message', onWindowMessage)
}

function stop(): void {
  window.removeEventListener('message', onWindowMessage)
  controller?.destroy()
  controller = null
}

onMounted(() => {
  if (entry.value && enabled.value) start()
  watch([() => entry.value?.entry, enabled], ([, on]) => {
    if (on && entry.value) start()
    else stop()
  })
})

// 主题变化推给插件（watch 在组件卸载时自动停止）
watch(
  () => theme.value.variables,
  (vars) => controller?.pushTheme(vars),
)

onBeforeUnmount(stop)
</script>

<template>
  <div class="plugin-host">
    <div v-if="src && enabled && !frameLoaded" class="loading">插件加载中…</div>
    <iframe
      v-if="src && enabled"
      ref="iframeRef"
      class="frame"
      sandbox="allow-scripts"
      :src="src"
      :title="entry?.name ?? pluginId"
      @load="frameLoaded = true"
    ></iframe>
    <div v-else class="disabled">
      <p>插件「{{ entry?.name ?? pluginId }}」未启用</p>
      <small>到设置页 · 插件页开启</small>
    </div>
  </div>
</template>

<style scoped>
.plugin-host {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.frame {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 10px;
}

.disabled {
  text-align: center;
  color: var(--hy-fg-muted);
}

.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--hy-fg-muted);
  pointer-events: none;
}

.disabled p {
  margin: 0 0 4px;
  font-size: 13px;
}

.disabled small {
  font-size: 11px;
}
</style>
