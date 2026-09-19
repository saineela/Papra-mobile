/**
 * Generates Papra launcher icons as PNGs (pure Node, zlib built-in).
 * Dark zinc background + sky-blue folder glyph, matching the in-app brand.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // rows with filter byte 0
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// Color helpers (oklch-ish approximations via plain sRGB)
const BG = [9, 9, 11] // #09090b zinc-950
const FG_SOFT = [250, 250, 250]
const SKY = [56, 189, 248] // sky-400 (#38bdf8)
const SKY_DEEP = [14, 165, 233] // sky-500 (#0ea5e9)

/** Rounded-rect signed distance: negative inside */
function roundedRectSdf(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r)
  const qy = Math.abs(py - cy) - (hh - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const s = size / 1024 // design at 1024, scale factor

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const px = x + 0.5
      const py = y + 0.5

      // Background rounded square (squircle-ish, radius 22%)
      const bgDist = roundedRectSdf(px, py, size / 2, size / 2, size / 2, size / 2, 224 * s)
      let r = BG[0]
      let g = BG[1]
      let b = BG[2]
      let alpha = 255

      // subtle vertical gradient on background
      const grad = (py / size) * 14
      r = Math.min(255, r + grad)
      g = Math.min(255, g + grad)
      b = Math.min(255, b + grad + 6)

      if (bgDist > 0.5) {
        alpha = 0
      } else if (bgDist > -0.5) {
        alpha = Math.round(255 * (0.5 - bgDist))
      }

      // Folder body: rounded rect centered slightly low
      const foldCx = size / 2
      const foldCy = size * 0.58
      const foldW = 300 * s
      const foldH = 210 * s
      const folderDist = roundedRectSdf(px, py, foldCx, foldCy, foldW, foldH, 56 * s)

      // Folder tab: rounded rect at top-left of body
      const tabDist = roundedRectSdf(px, py, foldCx - 140 * s, foldCy - foldH - 24 * s, 150 * s, 44 * s, 40 * s)
      const glyphDist = Math.min(folderDist, tabDist)

      if (glyphDist < 0) {
        // Sky gradient: top lighter, bottom deeper
        const t = Math.min(1, Math.max(0, (py - (foldCy - foldH - 80 * s)) / (2 * foldH + 160 * s)))
        r = SKY[0] + (SKY_DEEP[0] - SKY[0]) * t
        g = SKY[1] + (SKY_DEEP[1] - SKY[1]) * t
        b = SKY[2] + (SKY_DEEP[2] - SKY[2]) * t
        alpha = 255
      } else if (glyphDist < 1.2) {
        // soft edge AA
        const coverage = 1 - Math.min(1, (glyphDist + 0.6) / 1.8)
        const t = Math.min(1, Math.max(0, (py - (foldCy - foldH - 80 * s)) / (2 * foldH + 160 * s)))
        const gr = SKY[0] + (SKY_DEEP[0] - SKY[0]) * t
        const gg = SKY[1] + (SKY_DEEP[1] - SKY[1]) * t
        const gb = SKY[2] + (SKY_DEEP[2] - SKY[2]) * t
        r = r * (1 - coverage) + gr * coverage
        g = g * (1 - coverage) + gg * coverage
        b = b * (1 - coverage) + gb * coverage
      }

      rgba[idx] = Math.round(r)
      rgba[idx + 1] = Math.round(g)
      rgba[idx + 2] = Math.round(b)
      rgba[idx + 3] = alpha
    }
  }
  return encodePng(size, size, rgba)
}

const outDirs = [
  { dir: 'android/app/src/main/res/mipmap-mdpi', size: 48 },
  { dir: 'android/app/src/main/res/mipmap-hdpi', size: 72 },
  { dir: 'android/app/src/main/res/mipmap-xhdpi', size: 96 },
  { dir: 'android/app/src/main/res/mipmap-xxhdpi', size: 144 },
  { dir: 'android/app/src/main/res/mipmap-xxxhdpi', size: 192 },
]

// Standalone mode only needs the PNGs; android/ dir must exist first
mkdirSync('resources', { recursive: true })
writeFileSync('resources/icon.png', drawIcon(512))
writeFileSync('resources/icon-only.png', drawIcon(512))
writeFileSync('resources/icon-foreground.png', drawIcon(432))

for (const { dir, size } of outDirs) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/ic_launcher.png`, drawIcon(size))
  writeFileSync(`${dir}/ic_launcher_round.png`, drawIcon(size))
  writeFileSync(`${dir}/ic_launcher_foreground.png`, drawIcon(size))
}

console.log('Icons generated.')
