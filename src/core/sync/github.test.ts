import { describe, expect, it, vi } from 'vitest'

import { GIST_FILENAME, GithubGistSync, SyncError } from './github'

/** 构造注入用的 fetch：按 path 前缀路由到桩响应 */
function stubFetch(routes: Record<string, { status?: number; body?: unknown }>) {
  return vi.fn(async (input: string) => {
    const path = input.replace('https://api.github.com', '')
    const key = Object.keys(routes)
      .filter((k) => path.startsWith(k))
      .sort((a, b) => b.length - a.length)[0]
    const route = key ? routes[key] : { status: 404, body: { message: 'no stub' } }
    return new Response(route.body === undefined ? null : JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as unknown as typeof fetch
}

function client(routes: Record<string, { status?: number; body?: unknown }>) {
  return new GithubGistSync({ token: ' t1 ', fetchImpl: stubFetch(routes) as never })
}

describe('sync/GithubGistSync', () => {
  it('空 token 直接抛错', () => {
    expect(() => new GithubGistSync({ token: ' ' })).toThrow(SyncError)
  })

  it('verify 返回账号名，请求带 Authorization 头', async () => {
    const fetchImpl = stubFetch({ '/user': { body: { login: 'panda' } } })
    const sync = new GithubGistSync({ token: 'tok', fetchImpl: fetchImpl as never })
    await expect(sync.verify()).resolves.toBe('panda')
    const init = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]?.[1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('401 映射为令牌无效错误', async () => {
    const sync = client({ '/user': { status: 401, body: { message: 'Bad credentials' } } })
    await expect(sync.verify()).rejects.toThrow('令牌无效')
  })

  it('网络失败映射为网络错误', async () => {
    const sync = new GithubGistSync({
      token: 'tok',
      fetchImpl: (async () => {
        throw new TypeError('offline')
      }) as never,
    })
    await expect(sync.verify()).rejects.toThrow('网络错误')
  })

  it('findByConvention 按文件名命中 gist id', async () => {
    const sync = client({
      '/gists?': {
        body: [
          { id: 'other', files: { 'a.txt': {} } },
          { id: 'g1', files: { [GIST_FILENAME]: {} } },
        ],
      },
    })
    await expect(sync.findByConvention()).resolves.toBe('g1')
  })

  it('findByConvention 未命中返回 null', async () => {
    const sync = client({ '/gists?': { body: [{ id: 'x', files: {} }] } })
    await expect(sync.findByConvention()).resolves.toBeNull()
  })

  it('create 以 secret gist 建立并返回 id', async () => {
    const fetchImpl = stubFetch({ '/gists': { status: 201, body: { id: 'g9' } } })
    const sync = new GithubGistSync({ token: 'tok', fetchImpl: fetchImpl as never })
    await expect(sync.create('{}')).resolves.toBe('g9')
    const calls = (fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls
    const body = JSON.parse(String(calls[0]?.[1]?.body)) as {
      public: boolean
      files: Record<string, { content: string }>
    }
    expect(body.public).toBe(false)
    expect(body.files[GIST_FILENAME]?.content).toBe('{}')
  })

  it('pull 解析内容；文件缺失返回 null；截断抛错', async () => {
    const ok = client({
      '/gists/g1': {
        body: {
          id: 'g1',
          updated_at: '2026-10-24T00:00:00Z',
          files: { [GIST_FILENAME]: { content: '{"a":1}' } },
        },
      },
    })
    await expect(ok.pull('g1')).resolves.toMatchObject({ gistId: 'g1', content: '{"a":1}' })

    const empty = client({
      '/gists/g2': { body: { id: 'g2', updated_at: 't', files: {} } },
    })
    await expect(empty.pull('g2')).resolves.toMatchObject({ content: null })

    const truncated = client({
      '/gists/g3': {
        body: {
          id: 'g3',
          updated_at: 't',
          files: { [GIST_FILENAME]: { content: 'x', truncated: true } },
        },
      },
    })
    await expect(truncated.pull('g3')).rejects.toThrow('截断')
  })

  it('pull 已删除的 gist（404）给出明确错误', async () => {
    const sync = client({ '/gists/gone': { status: 404, body: {} } })
    await expect(sync.pull('gone')).rejects.toThrow('未找到')
  })

  it('push 走 PATCH 并返回更新时间', async () => {
    const sync = client({
      '/gists/g1': { body: { updated_at: '2026-10-24T01:02:03Z' } },
    })
    await expect(sync.push('g1', '{"b":2}')).resolves.toBe('2026-10-24T01:02:03Z')
  })
})
