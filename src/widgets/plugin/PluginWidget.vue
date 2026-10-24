<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { clampSlot } from '@/core/layout/grid'
import { patchSlot } from '@/core/layout/slots'
import { PluginHostController, type HostServices } from '@/core/plugins/host'
import { extensionUrl, openOptionsPage } from '@/platform/runtime'
import { getPluginEntry, pluginStorageNamespace } from '@/plugins/catalog'
import { useConfigStore } from '@/stores/config'
import { useTheme } from '@/themes/useTheme'

const props = defineProps<{
  pluginId: string
  /** 宿主所在槽位 id，layout.resize 需要 */
  slotId: string
}>()

const store = useConfigStore()
const { theme } = useTheme()

const entry = getPluginEntry(props.pluginId)
const installed = computed(() => store.config.plugins.find((p) => p.id === props.pluginId) ?? null)
const enabled = computed(() => installed.value?.enabled === true)
const permissions = computed(() => installed.value?.permissions ?? entry?.permissions ?? [])

const iframeRef = ref<HTMLIFrameElement | null>(null)
let controller: PluginHostController | null = null

function onWindowMessage(event: MessageEvent): void {
  if (!iframeRef.value || event.source !== iframeRef.value.contentWindow) return
  controller?.onMessage(event.data)
}

onMounted(() => {
  if (!entry || !enabled.value) return

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
        w: Math.max(w, entry.constraints.minW),
        h: Math.max(h, entry.constraints.minH),
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
    permissions: permissions.value,
    services,
    post: (message) => iframeRef.value?.contentWindow?.postMessage(message, '*'),
  })

  window.addEventListener('message', onWindowMessage)
})

// 主题变化推给插件（watch 在组件卸载时自动停止）
watch(
  () => theme.value.variables,
  (vars) => controller?.pushTheme(vars),
)

onBeforeUnmount(() => {
  window.removeEventListener('message', onWindowMessage)
  controller?.destroy()
  controller = null
})
</script>

<template>
  <div class="plugin-host">
    <iframe
      v-if="entry && enabled"
      ref="iframeRef"
      class="frame"
      sandbox="allow-scripts"
      :src="extensionUrl(entry.entry)"
      :title="entry.name"
    ></iframe>
    <div v-else class="disabled">
      <p>插件「{{ entry?.name ?? pluginId }}」未启用</p>
      <small>到设置页 · 插件页开启</small>
    </div>
  </div>
</template>

<style scoped>
.plugin-host {
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

.disabled p {
  margin: 0 0 4px;
  font-size: 13px;
}

.disabled small {
  font-size: 11px;
}
</style>
