/**
 * GitHub 云端同步（大纲 M6）：配置树 ↔ 用户名下的 secret gist。
 *
 * 认证用 fine-grained PAT（Account permissions → gists: read/write）或
 * classic token（gist scope）；token 只存本地 chrome.storage.local，
 * 绝不写入配置树（配置树本身会被同步出去）。
 * fetch 可注入，便于单测与将来接入代理。
 */

export const GIST_FILENAME = 'hyacinth-config.json'
export const GIST_DESCRIPTION = 'Hyacinth config sync'

const API = 'https://api.github.com'

export class SyncError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

/** 远端 gist 的可读快照 */
export interface GistRemote {
  gistId: string
  /** gist 最后更新时间（ISO） */
  updatedAt: string
  /** 配置文件内容；gist 存在但文件被删时为 null */
  content: string | null
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface GithubSyncOptions {
  token: string
  fetchImpl?: FetchLike
}

export class GithubGistSync {
  private readonly token: string
  private readonly doFetch: FetchLike

  constructor(opts: GithubSyncOptions) {
    this.token = opts.token.trim()
    this.doFetch = opts.fetchImpl ?? ((input, init) => fetch(input, init))
    if (!this.token) throw new SyncError('未配置 GitHub 访问令牌')
  }

  private async api<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response
    try {
      res = await this.doFetch(`${API}${path}`, {
        ...init,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      })
    } catch {
      throw new SyncError('网络错误：无法访问 api.github.com')
    }
    if (res.status === 401 || res.status === 403) {
      throw new SyncError('令牌无效或权限不足（需要 gists 读写权限）', res.status)
    }
    if (res.status === 404) throw new SyncError('未找到对应的 gist（可能已被删除）', 404)
    if (res.status === 429) throw new SyncError('GitHub 请求频率受限，稍后再试', 429)
    if (!res.ok) throw new SyncError(`GitHub API 错误：HTTP ${res.status}`, res.status)
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  /** 验证 token，返回账号名 */
  async verify(): Promise<string> {
    const user = await this.api<{ login: string }>('/user')
    return user.login
  }

  /** 按约定（文件名/描述）在用户 gists 里找同步 gist，返回 id 或 null */
  async findByConvention(): Promise<string | null> {
    interface GistStub {
      id: string
      description?: string
      files?: Record<string, unknown>
    }
    const gists = await this.api<GistStub[]>('/gists?per_page=100')
    const hit = gists.find((g) => g.files && GIST_FILENAME in g.files)
    return hit?.id ?? null
  }

  /** 创建同步 gist（secret），返回 gist id */
  async create(content: string): Promise<string> {
    const gist = await this.api<{ id: string }>('/gists', {
      method: 'POST',
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: { [GIST_FILENAME]: { content } },
      }),
    })
    return gist.id
  }

  /** 拉取 gist 里的配置内容 */
  async pull(gistId: string): Promise<GistRemote> {
    interface GistFull {
      id: string
      updated_at: string
      files?: Record<string, { content?: string; truncated?: boolean } | null>
    }
    const gist = await this.api<GistFull>(`/gists/${encodeURIComponent(gistId)}`)
    const file = gist.files?.[GIST_FILENAME]
    if (file && file.truncated) {
      throw new SyncError('云端配置过大（gist 文件被截断），请检查 gist 内容')
    }
    return {
      gistId: gist.id,
      updatedAt: gist.updated_at,
      content: file?.content ?? null,
    }
  }

  /** 推送配置内容，返回 gist 更新时间（ISO） */
  async push(gistId: string, content: string): Promise<string> {
    interface GistUpdated {
      updated_at: string
    }
    const gist = await this.api<GistUpdated>(`/gists/${encodeURIComponent(gistId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        files: { [GIST_FILENAME]: { content } },
      }),
    })
    return gist.updated_at
  }
}
