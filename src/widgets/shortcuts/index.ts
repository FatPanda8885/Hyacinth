import { defineWidget } from '../registry'
import { SHORTCUTS_DEFAULTS } from './model'
import ShortcutsWidget from './ShortcutsWidget.vue'

export const shortcutsWidget = defineWidget({
  type: 'shortcuts',
  name: '快捷方式',
  component: ShortcutsWidget,
  defaults: { ...SHORTCUTS_DEFAULTS, links: SHORTCUTS_DEFAULTS.links.map((l) => ({ ...l })) },
  constraints: { minW: 6, minH: 3, defaultW: 14, defaultH: 6 },
})

export { SHORTCUTS_DEFAULTS, newId, normalizeUrl } from './model'
export type { ShortcutLink, ShortcutsConfig } from './model'
