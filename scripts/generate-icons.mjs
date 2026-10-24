// 生成扩展图标（紫色渐变圆角底 + 风信子穗状花冠 + 叶片与花葶）。
// 纯 Node 实现：手写 zlib PNG 编码 + 超采样抗锯齿，无第三方依赖。
// 用法：npm run icons  →  输出到 public/icons/icon-{16,32,48,128}.png
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

// ---------- PNG 编码 ----------
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
  return c
})

function crc32(buf) {
  let c = -1
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'latin1')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), data])), 8 + data.length)
  return out
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // 位深
  ihdr[9] = 6 // 颜色类型：RGBA
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0 // 每行过滤器：None
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- 设计：品牌紫穗状风信子 ----------
const BG_TOP = [0x9b, 0x8f, 0xff]
const BG_BOTTOM = [0x65, 0x52, 0xd6]
const PETAL = [0xf4, 0xf1, 0xff]
const CORE = [0xff, 0xd6, 0x78]
const LEAF = [0x56, 0xc4, 0x94]
const LEAF_DARK = [0x38, 0x9e, 0x74]

/** 判定点是否在旋转椭圆内：p 相对椭圆中心，(rx, ry) 半径，rot 弧度 */
function inEllipse(px, py, cx, cy, rx, ry, rot) {
  const dx = px - cx
  const dy = py - cy
  const c = Math.cos(-rot)
  const s = Math.sin(-rot)
  const lx = dx * c - dy * s
  const ly = dx * s + dy * c
  return (lx / rx) ** 2 + (ly / ry) ** 2 <= 1
}

/** 穗状花冠的小花布局：8 行，上尖下饱满，每行 1~5 朵 */
const SPIKE_TOP = 0.15
const SPIKE_BOTTOM = 0.66
const SPIKE_ROWS = [
  // [相对高度, 行宽系数, 花朵半径系数]
  [0.0, 0.3, 0.78],
  [0.1, 0.55, 0.86],
  [0.22, 0.8, 0.95],
  [0.36, 0.95, 1.0],
  [0.52, 1.0, 0.97],
  [0.7, 0.92, 0.9],
  [0.88, 0.7, 0.8],
  [1.0, 0.4, 0.7],
]
const BASE_R = 0.062

/** 展开成 [{x, y, r}] 花朵列表 */
function layoutBlooms() {
  const blooms = []
  const cx = 0.5
  for (const [t, wmul, rmul] of SPIKE_ROWS) {
    const y = SPIKE_TOP + (SPIKE_BOTTOM - SPIKE_TOP) * t
    const r = BASE_R * rmul
    const halfSpan = 0.3 * wmul
    const count = t < 0.06 ? 1 : Math.max(1, Math.round(halfSpan / (r * 2.1)) + 1)
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? cx : cx + ((i / (count - 1)) * 2 - 1) * halfSpan
      blooms.push({ x, y, r })
    }
  }
  return blooms
}
const BLOOMS = layoutBlooms()

/** 单朵五瓣花的采样：命中返回预乘色 [r,g,b,1]，否则 null */
function sampleBloom(nx, ny, b) {
  const dx = nx - b.x
  const dy = ny - b.y
  if (Math.hypot(dx, dy) < b.r * 0.3) return [...CORE, 1]
  const pr = b.r * 0.62
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const px = b.x + Math.cos(a) * b.r * 0.42
    const py = b.y + Math.sin(a) * b.r * 0.42
    if (Math.hypot(nx - px, ny - py) < pr) return [...PETAL, 1]
  }
  return null
}

/** 圆角渐变底判定（命中返回 null 表示在底外） */
function roundedRect(nx, ny, radius) {
  const cx = Math.max(radius, Math.min(1 - radius, nx))
  const cy = Math.max(radius, Math.min(1 - radius, ny))
  return (nx - cx) ** 2 + (ny - cy) ** 2 <= radius * radius
}

/** 归一化坐标 → 预乘 [r,g,b,a]：完整穗状设计 */
function sample(nx, ny) {
  if (!roundedRect(nx, ny, 0.22)) return [0, 0, 0, 0]
  const t = ny
  const bg = [0, 1, 2].map((i) => BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t)

  // 花葶：中央竖线
  if (nx > 0.482 && nx < 0.518 && ny > 0.4 && ny < 0.92) return LEAF_DARK
  // 叶片：左右两片斜椭圆
  if (inEllipse(nx, ny, 0.29, 0.76, 0.17, 0.055, -0.55)) return LEAF
  if (inEllipse(nx, ny, 0.71, 0.78, 0.15, 0.05, 0.55)) return LEAF

  // 穗状花冠
  for (const b of BLOOMS) {
    // 包围盒粗筛
    if (Math.abs(nx - b.x) > b.r * 1.4 || Math.abs(ny - b.y) > b.r * 1.4) continue
    const hit = sampleBloom(nx, ny, b)
    if (hit) return hit
  }
  return bg
}

/** 16px 简化版：渐变底 + 一朵大花，保证轮廓可辨 */
function sample16(nx, ny) {
  if (!roundedRect(nx, ny, 0.24)) return [0, 0, 0, 0]
  const t = ny
  const bg = [0, 1, 2].map((i) => BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t)
  const hit = sampleBloom(nx, ny, { x: 0.5, y: 0.52, r: 0.34 })
  return hit ?? bg
}

/** 渲染 size×size 的 RGBA 位图，每像素 ss×ss 超采样做边缘抗锯齿 */
function render(size, ss, sampler = sample) {
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const nx = (x + (sx + 0.5) / ss) / size
          const ny = (y + (sy + 0.5) / ss) / size
          const [cr, cg, cb, ca] = sampler(nx, ny)
          r += cr * ca
          g += cg * ca
          b += cb * ca
          a += ca
        }
      }
      const i = (y * size + x) * 4
      buf[i] = a > 0 ? Math.round(r / a) : 0
      buf[i + 1] = a > 0 ? Math.round(g / a) : 0
      buf[i + 2] = a > 0 ? Math.round(b / a) : 0
      buf[i + 3] = Math.round((a / (ss * ss)) * 255)
    }
  }
  return buf
}

/** 整数倍盒式降采样（384 是 16/32/48/128 的公倍数） */
function downscale(src, srcSize, dstSize) {
  const f = srcSize / dstSize
  const dst = Buffer.alloc(dstSize * dstSize * 4)
  for (let y = 0; y < dstSize; y++) {
    for (let x = 0; x < dstSize; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const i = ((y * f + dy) * srcSize + (x * f + dx)) * 4
          const pa = src[i + 3] / 255
          r += src[i] * pa
          g += src[i + 1] * pa
          b += src[i + 2] * pa
          a += pa
        }
      }
      const i = (y * dstSize + x) * 4
      dst[i] = a > 0 ? Math.round(r / a) : 0
      dst[i + 1] = a > 0 ? Math.round(g / a) : 0
      dst[i + 2] = a > 0 ? Math.round(b / a) : 0
      dst[i + 3] = Math.round((a / (f * f)) * 255)
    }
  }
  return dst
}

mkdirSync(outDir, { recursive: true })
const base = render(384, 2)
for (const size of [32, 48, 128]) {
  const png = encodePng(size, size, downscale(base, 384, size))
  writeFileSync(join(outDir, `icon-${size}.png`), png)
  console.log(`ok  icon-${size}.png  ${png.length} bytes`)
}
const small = render(16, 4, sample16)
const png16 = encodePng(16, 16, small)
writeFileSync(join(outDir, 'icon-16.png'), png16)
console.log(`ok  icon-16.png  ${png16.length} bytes`)
