// 把 dist/ 打包成 hyacinth-<版本>.zip（Chrome/Edge 商店上传格式：
// zip 根级就是 manifest.json）。纯 Node 实现 zip（store + deflate），
// 无第三方依赖。用法：npm run build:zip（先自动 build）
import { createWriteStream } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateRawSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const outFile = join(root, `hyacinth-${pkg.version}.zip`)

async function walk(dir) {
  const out = []
  for (const name of await readdir(dir)) {
    const full = join(dir, name)
    const s = await stat(full)
    if (s.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

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

function dosDateTime(d = new Date()) {
  const time =
    (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { time, date }
}

const files = await walk(distDir)
const { time, date } = dosDateTime()
const chunks = []
const central = []
let offset = 0

for (const full of files) {
  const name = relative(distDir, full).split('\\').join('/')
  const data = await readFile(full)
  const comp = deflateRawSync(data, { level: 9 })
  const useDeflate = comp.length < data.length
  const body = useDeflate ? comp : data
  const crc = crc32(data)

  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(20, 4) // 最小解压版本
  local.writeUInt16LE(0, 6) // 通用标志
  local.writeUInt16LE(useDeflate ? 8 : 0, 8) // deflate / store
  local.writeUInt16LE(time, 10)
  local.writeUInt16LE(date, 12)
  local.writeUInt32LE(crc, 14)
  local.writeUInt32LE(body.length, 18)
  local.writeUInt32LE(data.length, 22)
  local.writeUInt16LE(name.length, 26)
  local.writeUInt16LE(0, 28)
  chunks.push(local, Buffer.from(name, 'latin1'), body)

  const cd = Buffer.alloc(46)
  cd.writeUInt32LE(0x02014b50, 0)
  cd.writeUInt16LE(20, 4)
  cd.writeUInt16LE(20, 6)
  cd.writeUInt16LE(0, 8)
  cd.writeUInt16LE(useDeflate ? 8 : 0, 10)
  cd.writeUInt16LE(time, 12)
  cd.writeUInt16LE(date, 14)
  cd.writeUInt32LE(crc, 16)
  cd.writeUInt32LE(body.length, 20)
  cd.writeUInt32LE(data.length, 24)
  cd.writeUInt16LE(name.length, 28)
  cd.writeUInt16LE(0, 30) // 额外字段
  cd.writeUInt16LE(0, 32) // 注释
  cd.writeUInt16LE(0, 34) // 盘号
  cd.writeUInt16LE(0, 36) // 内部属性
  cd.writeUInt32LE(0, 38) // 外部属性
  cd.writeUInt32LE(offset, 42)
  central.push(cd, Buffer.from(name, 'latin1'))

  offset += local.length + name.length + body.length
}

const cdBuf = Buffer.concat(central)
const end = Buffer.alloc(22)
end.writeUInt32LE(0x06054b50, 0)
end.writeUInt16LE(0, 4)
end.writeUInt16LE(0, 6)
end.writeUInt16LE(files.length, 8)
end.writeUInt16LE(files.length, 10)
end.writeUInt32LE(cdBuf.length, 12)
end.writeUInt32LE(offset, 16)
end.writeUInt16LE(0, 20)

const out = createWriteStream(outFile)
out.end(Buffer.concat([...chunks, cdBuf, end]))
await new Promise((resolve) => out.on('close', resolve))
console.log(`ok  ${relative(root, outFile)}  (${files.length} files)`)
