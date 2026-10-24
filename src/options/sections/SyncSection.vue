<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import { GithubGistSync } from '@/core/sync/github'
import { loadSyncSettings, saveSyncSettings, type SyncSettings } from '@/platform/storage'
import { migrate } from '@/shared/config'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()

const settings = reactive<SyncSettings>({
  token: '',
  gistId: null,
  login: null,
  autoPush: false,
  lastPushAt: null,
  lastPulledAt: null,
})
const loaded = ref(false)
const tokenInput = ref('')
const busy = ref<'' | 'bind' | 'push' | 'pull'>('')
const notice = ref('')
const error = ref('')
const remote = ref<{ updatedAt: string; hasContent: boolean } | null>(null)

const bound = computed(() => !!settings.gistId && !!settings.login)

function fmt(iso: string | null): string {
  if (!iso) return '从未'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function client(): GithubGistSync {
  return new GithubGistSync({ token: settings.token })
}

async function persist(): Promise<void> {
  await saveSyncSettings({ ...settings })
}

/** 绑定：验证 token → 记录账号 → 按约定找已有同步 gist（找不到则首次推送时创建） */
async function bind(): Promise<void> {
  error.value = ''
  notice.value = ''
  busy.value = 'bind'
  try {
    const sync = new GithubGistSync({ token: tokenInput.value })
    const login = await sync.verify()
    const gistId = await sync.findByConvention()
    settings.token = tokenInput.value.trim()
    settings.login = login
    settings.gistId = gistId
    tokenInput.value = ''
    await persist()
    notice.value = gistId
      ? `已绑定 ${login}，并找到既有的同步 gist`
      : `已绑定 ${login}：点「立即推送」创建云端同步 gist`
  } catch (err) {
    error.value = err instanceof Error ? err.message : '绑定失败'
  } finally {
    busy.value = ''
  }
}

async function unbind(): Promise<void> {
  settings.gistId = null
  settings.login = null
  settings.token = ''
  settings.autoPush = false
  remote.value = null
  await persist()
  notice.value = '已解除绑定（云端 gist 保留，可在 GitHub 上自行删除）'
}

/** 推送当前配置树到云端；首次推送自动创建 gist */
async function push(): Promise<void> {
  error.value = ''
  notice.value = ''
  busy.value = 'push'
  try {
    await store.flush()
    const sync = client()
    let gistId = settings.gistId
    if (!gistId) {
      gistId = await sync.create(JSON.stringify(store.config, null, 2))
      settings.gistId = gistId
    } else {
      await sync.push(gistId, JSON.stringify(store.config, null, 2))
    }
    settings.lastPushAt = new Date().toISOString()
    remote.value = { updatedAt: settings.lastPushAt, hasContent: true }
    await persist()
    notice.value = '已推送到云端'
  } catch (err) {
    error.value = err instanceof Error ? err.message : '推送失败'
  } finally {
    busy.value = ''
  }
}

/** 从云端恢复：拉取 → migrate 修整 → 覆盖本地配置树 */
async function pull(): Promise<void> {
  error.value = ''
  notice.value = ''
  if (!settings.gistId) {
    error.value = '尚未绑定同步 gist'
    return
  }
  if (!window.confirm('用云端配置覆盖本机配置？本机当前配置将丢失（建议先推送一次备份）。')) return
  busy.value = 'pull'
  try {
    const gist = await client().pull(settings.gistId)
    remote.value = { updatedAt: gist.updatedAt, hasContent: gist.content !== null }
    if (gist.content === null) {
      error.value = '云端 gist 里没有配置文件'
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(gist.content)
    } catch {
      error.value = '云端配置不是合法 JSON'
      return
    }
    store.replaceAll(migrate(parsed))
    settings.lastPulledAt = new Date().toISOString()
    await persist()
    notice.value = '已从云端恢复配置'
  } catch (err) {
    error.value = err instanceof Error ? err.message : '恢复失败'
  } finally {
    busy.value = ''
  }
}

/** 查看云端状态（不覆盖本地） */
async function peek(): Promise<void> {
  error.value = ''
  if (!settings.gistId) return
  try {
    const gist = await client().pull(settings.gistId)
    remote.value = { updatedAt: gist.updatedAt, hasContent: gist.content !== null }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '读取云端失败'
  }
}

async function toggleAutoPush(): Promise<void> {
  settings.autoPush = !settings.autoPush
  await persist()
}

onMounted(async () => {
  Object.assign(settings, await loadSyncSettings())
  loaded.value = true
  if (settings.gistId) void peek()
})
</script>

<template>
  <div class="card">
    <p class="tip">
      把配置树同步到你 GitHub 账号下的 secret gist：多台设备用同一份主题、布局与插件。
      令牌只保存在本机，绝不会随配置同步出去。
    </p>

    <template v-if="!bound">
      <div class="bind-form">
        <input
          v-model="tokenInput"
          type="password"
          placeholder="GitHub 访问令牌（fine-grained PAT，勾选 gists 读写）"
          autocomplete="off"
          spellcheck="false"
        />
        <button type="button" class="btn" :disabled="busy === 'bind' || !tokenInput" @click="bind">
          {{ busy === 'bind' ? '验证中…' : '绑定' }}
        </button>
      </div>
      <details class="help">
        <summary>如何创建令牌？</summary>
        <ol>
          <li>GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token</li>
          <li>Account permissions 里给 <strong>Gists → Read and write</strong>，其余保持默认</li>
          <li>生成后复制粘贴到上方（classic token 则勾选 <strong>gist</strong> scope）</li>
        </ol>
      </details>
    </template>

    <template v-else>
      <div class="status">
        <div class="row">
          <span class="k">账号</span>
          <span class="v">{{ settings.login }}</span>
        </div>
        <div class="row">
          <span class="k">云端</span>
          <span class="v">
            <template v-if="remote">
              {{ remote.hasContent ? `配置已更新于 ${fmt(remote.updatedAt)}` : 'gist 为空' }}
            </template>
            <template v-else>读取中…</template>
            <a
              class="gist-link"
              :href="`https://gist.github.com/${settings.login}/${settings.gistId}`"
              target="_blank"
              rel="noreferrer"
              >查看 gist</a
            >
          </span>
        </div>
        <div class="row">
          <span class="k">上次推送</span>
          <span class="v">{{ fmt(settings.lastPushAt) }}</span>
        </div>
        <div class="row">
          <span class="k">上次恢复</span>
          <span class="v">{{ fmt(settings.lastPulledAt) }}</span>
        </div>
      </div>

      <div class="ops">
        <button type="button" class="btn primary" :disabled="busy !== ''" @click="push">
          {{ busy === 'push' ? '推送中…' : '立即推送' }}
        </button>
        <button type="button" class="btn" :disabled="busy !== ''" @click="pull">
          {{ busy === 'pull' ? '恢复中…' : '从云端恢复' }}
        </button>
        <button type="button" class="btn ghost" :disabled="busy !== ''" @click="unbind">
          解除绑定
        </button>
      </div>

      <button type="button" class="auto" :class="{ on: settings.autoPush }" @click="toggleAutoPush">
        <span class="box" aria-hidden="true"></span>
        自动推送：本机配置保存后同步到云端
      </button>
    </template>

    <p v-if="notice" class="notice ok" role="status">{{ notice }}</p>
    <p v-if="error" class="notice" role="alert">{{ error }}</p>
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

.bind-form {
  display: flex;
  gap: 10px;
  align-items: center;
}

.bind-form input {
  flex: 1;
  min-width: 0;
  height: 36px;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--hy-border);
  background: var(--hy-bg);
  color: var(--hy-fg);
  font-size: 13px;
  line-height: 1.4;
  outline: none;
  transition: border-color 0.15s ease;
}

.bind-form input::placeholder {
  color: var(--hy-fg-muted);
}

.bind-form input:focus {
  border-color: var(--hy-accent);
}

.help {
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--hy-fg-muted);
}

.help summary {
  cursor: pointer;
  color: var(--hy-fg);
  font-size: 13px;
}

.help ol {
  margin: 8px 0 0;
  padding-left: 18px;
  line-height: 1.8;
}

.status {
  border: 1px solid var(--hy-border);
  border-radius: 10px;
  background: var(--hy-bg);
  padding: 6px 14px;
  margin-bottom: 14px;
}

.row {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 8px 0;
}

.row + .row {
  border-top: 1px solid var(--hy-border);
}

.k {
  width: 64px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--hy-fg-muted);
}

.v {
  font-size: 13px;
  color: var(--hy-fg);
}

.gist-link {
  margin-left: 10px;
  font-size: 12px;
  color: var(--hy-accent);
}

.ops {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  height: 36px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid var(--hy-border);
  background: transparent;
  color: var(--hy-fg-muted);
  font-size: 13px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
}

.btn:hover:not(:disabled) {
  color: var(--hy-fg);
  border-color: var(--hy-fg-muted);
}

.btn.primary {
  background: var(--hy-accent-soft);
  border-color: var(--hy-accent-soft);
  color: var(--hy-accent);
}

.btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.btn.ghost:hover:not(:disabled) {
  color: #e5484d;
  border-color: rgba(229, 72, 77, 0.45);
  background: rgba(229, 72, 77, 0.08);
}

.auto {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: none;
  color: var(--hy-fg-muted);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s ease;
}

.auto:hover {
  color: var(--hy-fg);
}

.auto .box {
  width: 15px;
  height: 15px;
  border-radius: 4px;
  border: 1px solid var(--hy-border);
  background: var(--hy-bg);
  display: inline-block;
  position: relative;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.auto.on {
  color: var(--hy-accent);
}

.auto.on .box {
  border-color: var(--hy-accent);
  background: var(--hy-accent-soft);
}

.auto.on .box::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--hy-accent);
}

.notice {
  margin: 12px 0 0;
  color: #e5484d;
  font-size: 13px;
}

.notice.ok {
  color: var(--hy-accent);
}
</style>
