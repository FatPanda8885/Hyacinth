/**
 * 自动推送：配置落盘完成后（saveState pending→saved）延迟几秒推送到云端。
 * 失败静默（不打扰用户），手动推送/恢复优先；15 秒内刚推过则跳过防重复。
 */
import { watch } from 'vue'

import { loadSyncSettings, saveSyncSettings } from '@/platform/storage'
import { useConfigStore } from '@/stores/config'

import { GithubGistSync } from './github'

const DEBOUNCE_MS = 8000
const RECENT_PUSH_MS = 15_000

export function useAutoPush(): void {
  const store = useConfigStore()
  let timer: ReturnType<typeof setTimeout> | undefined
  let syncing = false

  watch(
    () => store.saveState,
    async (state, prev) => {
      if (state !== 'saved' || prev !== 'pending') return
      clearTimeout(timer)
      timer = setTimeout(async () => {
        if (syncing) return
        const s = await loadSyncSettings()
        if (!s.autoPush || !s.gistId || !s.token) return
        if (s.lastPushAt && Date.now() - new Date(s.lastPushAt).getTime() < RECENT_PUSH_MS) return
        syncing = true
        try {
          const sync = new GithubGistSync({ token: s.token })
          await sync.push(s.gistId, JSON.stringify(store.config, null, 2))
          await saveSyncSettings({ ...s, lastPushAt: new Date().toISOString() })
        } catch {
          // 静默失败：不打断用户，下次保存或手动推送再试
        } finally {
          syncing = false
        }
      }, DEBOUNCE_MS)
    },
  )
}
