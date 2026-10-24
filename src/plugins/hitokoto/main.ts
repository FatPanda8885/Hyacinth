import { HyacinthPlugin } from '@/plugin-sdk/client'

/** 一言示例插件：走通 fetch 域名白名单代理（fetch:v1.hitokoto.cn）+ storage 缓存 */

const plugin = new HyacinthPlugin()

interface Quote {
  text: string
  from: string
}

const els = {
  text: document.getElementById('text')!,
  from: document.getElementById('from')!,
  refresh: document.getElementById('refresh') as HTMLButtonElement,
}

function render(quote: Quote | undefined): void {
  els.text.textContent = quote?.text ?? '（空）'
  els.from.textContent = quote?.from ? `—— ${quote.from}` : ''
}

async function load(): Promise<void> {
  els.refresh.disabled = true
  els.text.textContent = '正在取一句话…'
  els.from.textContent = ''
  try {
    // 经宿主代理发起；域名必须命中权限清单 fetch:v1.hitokoto.cn
    const res = await plugin.fetch<{ status: number; body: string }>(
      'https://v1.hitokoto.cn/?encode=json',
    )
    const data = JSON.parse(res.body) as { hitokoto: string; from?: string; from_who?: string }
    const quote: Quote = {
      text: data.hitokoto,
      from: data.from_who || data.from || '',
    }
    render(quote)
    await plugin.setStorage('last', quote)
  } catch (err) {
    els.text.textContent = `获取失败：${err instanceof Error ? err.message : '未知错误'}`
  } finally {
    els.refresh.disabled = false
  }
}

void plugin.ready.then(async () => {
  plugin.applyTheme()
  plugin.onThemeChange = (vars) => plugin.applyTheme(vars)

  const cached = await plugin.getStorage<Quote>('last')
  render(cached)
  if (!cached) await load()

  els.refresh.addEventListener('click', () => void load())
})
