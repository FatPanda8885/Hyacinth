/**
 * 背景设置（M1 简化版）：渐变 / 纯色 / 图片三选一。
 * 这是页面级设置而非可摆放挂件；M3 主题系统会把它正式收编为主题的一部分。
 */

export type BackgroundType = 'gradient' | 'color' | 'image'

export type BackgroundConfig = {
  type: BackgroundType
  /** 渐变/颜色为 CSS 值；图片为 http(s) URL 或本地资产引用 asset:<id> */
  value: string
}

/** 本地资产引用前缀：图片存 IndexedDB（platform/assetStore），配置只存引用 */
const ASSET_PREFIX = 'asset:'

export function isAssetRef(value: string): boolean {
  return value.startsWith(ASSET_PREFIX) && value.length > ASSET_PREFIX.length
}

export function makeAssetRef(id: string): string {
  return `${ASSET_PREFIX}${id}`
}

export function assetRefToId(value: string): string {
  return value.slice(ASSET_PREFIX.length)
}

export type BackgroundPreset = {
  id: string
  label: string
  value: string
}

/** 预设渐变统一偏暗，保证白色前景可读 */
export const PRESET_GRADIENTS: BackgroundPreset[] = [
  {
    id: 'aurora',
    label: '极光',
    value: 'linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  },
  { id: 'midnight', label: '午夜', value: 'linear-gradient(180deg, #0b0d17 0%, #1b1e3a 100%)' },
  { id: 'wisteria', label: '紫藤', value: 'linear-gradient(160deg, #1f0f38 0%, #4b2c70 100%)' },
  { id: 'deepsea', label: '深海', value: 'linear-gradient(160deg, #141e30 0%, #243b55 100%)' },
  { id: 'forest', label: '森林', value: 'linear-gradient(160deg, #0f2f26 0%, #1d4e3f 100%)' },
  { id: 'carbon', label: '碳黑', value: 'linear-gradient(160deg, #101014 0%, #23232b 100%)' },
]

export const PRESET_COLORS: BackgroundPreset[] = [
  { id: 'ink', label: '墨', value: '#101014' },
  { id: 'slate', label: '石板', value: '#1e2530' },
  { id: 'navy', label: '藏青', value: '#0f2437' },
  { id: 'plum', label: '梅紫', value: '#2a1f33' },
  { id: 'moss', label: '苔绿', value: '#123028' },
  { id: 'umber', label: '棕褐', value: '#2e1f1a' },
]

export const BACKGROUND_DEFAULTS: BackgroundConfig = {
  type: 'gradient',
  value: PRESET_GRADIENTS[0].value,
}

/** 配置 → 背景样式对象；非法输入退回默认值（纯函数，便于测试） */
export function backgroundStyleFor(cfg: unknown): {
  background: string
  backgroundColor: string
} {
  let conf: BackgroundConfig = BACKGROUND_DEFAULTS
  if (
    typeof cfg === 'object' &&
    cfg !== null &&
    'type' in cfg &&
    'value' in cfg &&
    typeof (cfg as BackgroundConfig).value === 'string' &&
    (cfg as BackgroundConfig).value.trim() !== ''
  ) {
    const candidate = cfg as BackgroundConfig
    if (candidate.type === 'gradient' || candidate.type === 'color' || candidate.type === 'image') {
      conf = candidate
    }
  }

  if (conf.type === 'image') {
    // 底色兜底：图片加载前的空窗与加载失败时的观感
    return {
      background: `url("${conf.value}") center / cover no-repeat`,
      backgroundColor: '#101014',
    }
  }
  return { background: conf.value, backgroundColor: 'transparent' }
}
