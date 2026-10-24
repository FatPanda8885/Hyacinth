/** 搜索挂件：引擎定义与配置 */

export interface SearchEngine {
  id: string
  name: string
  buildUrl(query: string): string
}

export const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'bing',
    name: '必应',
    buildUrl: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'baidu',
    name: '百度',
    buildUrl: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`,
  },
  {
    id: 'google',
    name: 'Google',
    buildUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    buildUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  },
]

export type SearchConfig = {
  engine: string
}

export const SEARCH_DEFAULTS: SearchConfig = {
  engine: 'bing',
}

/** 按 id 取引擎；未知 id 退回第一个（而不是报错） */
export function getSearchEngine(id: string): SearchEngine {
  return SEARCH_ENGINES.find((e) => e.id === id) ?? SEARCH_ENGINES[0]
}
