import { defineWidget } from '../registry'
import { SEARCH_DEFAULTS } from './engines'
import SearchWidget from './SearchWidget.vue'

export const searchWidget = defineWidget({
  type: 'search',
  name: '搜索',
  component: SearchWidget,
  defaults: { ...SEARCH_DEFAULTS },
})

export { SEARCH_DEFAULTS, SEARCH_ENGINES, getSearchEngine } from './engines'
export type { SearchConfig, SearchEngine } from './engines'
