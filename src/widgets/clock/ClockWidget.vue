<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useConfigStore } from '@/stores/config'

import {
  CLOCK_DEFAULTS,
  type ClockConfig,
  formatDateZh,
  handAngles,
  pad,
  splitTime,
  to12h,
} from './model'

const store = useConfigStore()
store.ensureWidgetDefaults('clock', CLOCK_DEFAULTS)
const cfg = computed(() => store.config.widgets.clock as ClockConfig)

const now = ref(new Date())
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const parts = computed(() => splitTime(now.value))

const digital = computed(() => {
  const { h, m, s } = parts.value
  const twelve = !cfg.value.hour24
  const { h: h12, suffix } = to12h(h)
  return {
    hh: pad(twelve ? h12 : h),
    mm: pad(m),
    ss: cfg.value.showSeconds ? pad(s) : '',
    suffix: twelve ? suffix : '',
  }
})

const angles = computed(() => handAngles(parts.value))
const dateText = computed(() => formatDateZh(now.value))
</script>

<template>
  <section class="clock">
    <div v-if="cfg.mode === 'digital'" class="digital" aria-live="off">
      <span class="time"
        >{{ digital.hh }}:{{ digital.mm }}<span v-if="digital.ss">:{{ digital.ss }}</span></span
      >
      <span v-if="digital.suffix" class="suffix">{{ digital.suffix }}</span>
    </div>

    <svg v-else class="analog" viewBox="0 0 100 100" role="img" aria-label="时钟">
      <circle class="face" cx="50" cy="50" r="47" />
      <line
        v-for="i in 12"
        :key="i"
        class="tick"
        :class="{ major: i % 3 === 0 }"
        x1="50"
        y1="6"
        x2="50"
        :y2="i % 3 === 0 ? 12 : 9.5"
        :transform="`rotate(${(i - 1) * 30} 50 50)`"
      />
      <line
        class="hand hour"
        x1="50"
        y1="54"
        x2="50"
        y2="27"
        :transform="`rotate(${angles.hour} 50 50)`"
      />
      <line
        class="hand minute"
        x1="50"
        y1="56"
        x2="50"
        y2="17"
        :transform="`rotate(${angles.minute} 50 50)`"
      />
      <line
        v-if="cfg.showSeconds"
        class="hand second"
        x1="50"
        y1="58"
        x2="50"
        y2="13"
        :transform="`rotate(${angles.second} 50 50)`"
      />
      <circle class="pin" cx="50" cy="50" r="2.4" />
    </svg>

    <p v-if="cfg.showDate" class="date">{{ dateText }}</p>
  </section>
</template>

<style scoped>
.clock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--hy-on-bg);
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
}

.digital {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.time {
  font-size: 76px;
  font-weight: 200;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  line-height: 1;
}

.suffix {
  font-size: 18px;
  font-weight: 400;
  color: var(--hy-on-bg-muted);
}

.analog {
  width: 150px;
  height: 150px;
}

.face {
  fill: var(--hy-glass);
  stroke: var(--hy-on-bg);
  stroke-opacity: 0.3;
  stroke-width: 1.5;
}

.tick {
  stroke: var(--hy-on-bg);
  stroke-opacity: 0.45;
  stroke-width: 1;
}

.tick.major {
  stroke: var(--hy-on-bg);
  stroke-opacity: 0.85;
  stroke-width: 1.8;
}

.hand {
  stroke: var(--hy-on-bg);
  stroke-linecap: round;
}

.hand.hour {
  stroke-width: 3.4;
}

.hand.minute {
  stroke-width: 2.2;
}

.hand.second {
  stroke: var(--hy-accent);
  stroke-width: 1.2;
}

.pin {
  fill: var(--hy-accent);
}

.date {
  margin: 0;
  font-size: 17px;
  color: var(--hy-on-bg-muted);
  letter-spacing: 0.06em;
}
</style>
