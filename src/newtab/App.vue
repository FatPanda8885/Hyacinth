<script setup lang="ts">
import { onMounted } from 'vue'

import { openOptionsPage } from '@/platform/runtime'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()
onMounted(() => void store.load())
</script>

<template>
  <main class="shell">
    <div class="mark" aria-hidden="true">❧</div>
    <h1 class="title">Hyacinth</h1>
    <p class="tagline">简洁、高度可定制的新标签页</p>
    <p class="status" :class="{ ready: store.loaded }">
      {{ store.loaded ? `配置已加载 · schema v${store.config.schemaVersion}` : '正在加载配置…' }}
    </p>
    <button class="ghost" type="button" @click="openOptionsPage">打开设置</button>
    <footer class="foot">M0 脚手架 · 画布布局 / 主题 / 插件系统建设中</footer>
  </main>
</template>

<style scoped>
.shell {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.mark {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  font-size: 40px;
  color: #fff;
  background: linear-gradient(180deg, var(--hy-accent) 0%, #4c3fd2 100%);
}

.title {
  margin: 0;
  font-size: 28px;
  letter-spacing: 0.12em;
}

.tagline {
  margin: 0;
  color: var(--hy-fg-muted);
}

.status {
  margin: 0;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--hy-border);
  color: var(--hy-fg-muted);
  font-size: 13px;
}

.status.ready {
  color: var(--hy-accent);
  border-color: var(--hy-accent-soft);
  background: var(--hy-accent-soft);
}

.ghost {
  margin-top: 8px;
  padding: 8px 22px;
  border-radius: var(--hy-radius);
  border: 1px solid var(--hy-border);
  background: var(--hy-bg-soft);
  color: var(--hy-fg);
  font-size: 14px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.ghost:hover {
  border-color: var(--hy-accent);
}

.foot {
  position: absolute;
  bottom: 20px;
  color: var(--hy-fg-muted);
  font-size: 12px;
}
</style>
