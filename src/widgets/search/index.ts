import { defineWidget } from '../registry'
import { SEARCH_DEFAULTS } from './engines'
import SearchWidget from './SearchWidget.vue'

export const searchWidget = defineWidget({
  type: 'search',
  name: '搜索',
  component: SearchWidget,
  defaults: { ...SEARCH_DEFAULTS },
  constraints: { minW: 5, minH: 2, defaultW: 10, defaultH: 3 },
})

export { SEARCH_DEFAULTS, SEARCH_ENGINES, getSearchEngine } from './engines'
export type { SearchConfig, SearchEngine } from './engines'
