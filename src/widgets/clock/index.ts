import { defineWidget } from '../registry'
import { CLOCK_DEFAULTS } from './model'
import ClockWidget from './ClockWidget.vue'

export const clockWidget = defineWidget({
  type: 'clock',
  name: '时钟',
  component: ClockWidget,
  defaults: { ...CLOCK_DEFAULTS },
})

export { CLOCK_DEFAULTS } from './model'
export type { ClockConfig } from './model'
