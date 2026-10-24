import { defineWidget } from '../registry'
import { CLOCK_DEFAULTS } from './model'
import ClockWidget from './ClockWidget.vue'

export const clockWidget = defineWidget({
  type: 'clock',
  name: '时钟',
  component: ClockWidget,
  defaults: { ...CLOCK_DEFAULTS },
  constraints: { minW: 4, minH: 3, defaultW: 8, defaultH: 6 },
})

export { CLOCK_DEFAULTS } from './model'
export type { ClockConfig } from './model'
