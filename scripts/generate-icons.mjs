// 生成扩展图标（紫色圆角底 + 白色六瓣花）。
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
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), out.length - 4)
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

// ---------- 绘制 ----------
const BG_TOP = [0x6d, 0x5d, 0xf6]
const BG_BOTTOM = [0x4c, 0x3f, 0xd2]
const PETAL = [0xff, 0xff, 0xff]
const CORE = [0xfd, 0xe6, 0x8a]

/** 归一化坐标 [0,1) → 预乘 [r,g,b,a] */
function sample(nx, ny) {
  // 圆角方形判定：把点钳制到内缩 radius 的矩形，再比距离
  const radius = 0.22
  const cx = Math.max(radius, Math.min(1 - radius, nx))
  const cy = Math.max(radius, Math.min(1 - radius, ny))
  if ((nx - cx) ** 2 + (ny - cy) ** 2 > radius * radius) return [0, 0, 0, 0]

  const t = ny
  const bg = [0, 1, 2].map((i) => BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t)

  // 六瓣花：中心花心 + 绕心均匀分布的 6 个花瓣圆
  const dx = nx - 0.5
  const dy = ny - 0.5
  if (Math.hypot(dx, dy) < 0.09) return [...CORE, 1]
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    if (Math.hypot(dx - Math.cos(a) * 0.17, dy - Math.sin(a) * 0.17) < 0.115) {
      return [...PETAL, 1]
    }
  }
  return [...bg, 1]
}

/** 渲染 size×size 的 RGBA 位图，每像素 ss×ss 超采样做边缘抗锯齿 */
function render(size, ss) {
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
          const [cr, cg, cb, ca] = sample(nx, ny)
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
for (const size of [16, 32, 48, 128]) {
  const png = encodePng(size, size, downscale(base, 384, size))
  writeFileSync(join(outDir, `icon-${size}.png`), png)
  console.log(`ok  icon-${size}.png  ${png.length} bytes`)
}
