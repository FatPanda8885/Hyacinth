import type { ThemeDefinition } from '@/shared/types'

/**
 * 内置主题（大纲 4.3）：只声明被接管的 --hy-* 变量，其余回落到 base.css 默认值。
 * night 即默认暗色，变量留空 = 与 base.css 完全一致。
 */
export const BUILTIN_THEMES: ThemeDefinition[] = [
  {
    id: 'night',
    name: '夜幕',
    variables: {},
    background: {
      type: 'gradient',
      value: 'linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    },
  },
  {
    id: 'mist',
    name: '晨雾',
    variables: {
      '--hy-bg': '#f2f3f7',
      '--hy-bg-soft': '#ffffff',
      '--hy-fg': '#23262e',
      '--hy-fg-muted': '#6b7080',
      '--hy-accent': '#6558d8',
      '--hy-accent-soft': 'rgba(101, 88, 216, 0.12)',
      '--hy-border': '#d9dbe4',
      '--hy-on-bg': '#23262e',
      '--hy-on-bg-muted': 'rgba(35, 38, 46, 0.72)',
      '--hy-glass': 'rgba(255, 255, 255, 0.72)',
      '--hy-glass-border': 'rgba(20, 22, 30, 0.12)',
      '--hy-glass-hover': 'rgba(20, 22, 30, 0.06)',
      '--hy-popover': 'rgba(255, 255, 255, 0.96)',
    },
    background: {
      type: 'gradient',
      value: 'linear-gradient(160deg, #e8ecf5 0%, #f6f7fb 55%, #e3e9f4 100%)',
    },
  },
  {
    id: 'tundra',
    name: '苔原',
    variables: {
      '--hy-bg': '#0c1210',
      '--hy-bg-soft': '#141d19',
      '--hy-fg': '#e6efe9',
      '--hy-fg-muted': '#8ba398',
      '--hy-accent': '#4fbc8f',
      '--hy-accent-soft': 'rgba(79, 188, 143, 0.15)',
      '--hy-border': '#22302a',
      '--hy-on-bg': '#eaf4ee',
      '--hy-on-bg-muted': 'rgba(234, 244, 238, 0.75)',
      '--hy-glass': 'rgba(12, 18, 16, 0.55)',
      '--hy-glass-border': 'rgba(234, 244, 238, 0.16)',
      '--hy-glass-hover': 'rgba(234, 244, 238, 0.1)',
      '--hy-popover': 'rgba(12, 18, 16, 0.92)',
    },
    background: {
      type: 'gradient',
      value: 'linear-gradient(160deg, #0d1a15 0%, #16302a 100%)',
    },
  },
]
