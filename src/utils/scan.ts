/**
 * Document scanner image pipeline — everything runs on the device:
 *
 *   capture  →  auto-frame (find the paper)  →  rotate / crop  →  filter  →  PDF
 *
 * All helpers return fresh canvases so an edit is never destructive to the
 * original capture; that keeps "Reset" trivially correct.
 */

export type FilterMode = 'original' | 'enhance' | 'grayscale' | 'bw'

export interface ScanFilters {
  mode: FilterMode
  /** −100 … 100 */
  brightness: number
  /** −100 … 100 */
  contrast: number
}

/** Relative rectangle (0…1) inside an image. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const IDENTITY_FILTERS: ScanFilters = { mode: 'original', brightness: 0, contrast: 0 }

/** Sensible defaults for paper: a touch more contrast, mild brightness lift. */
export const DEFAULT_FILTERS: ScanFilters = { mode: 'enhance', brightness: 4, contrast: 14 }

export const FULL_RECT: Rect = { x: 0, y: 0, w: 1, h: 1 }

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

export function isEdited(filters: ScanFilters) {
  return filters.mode !== 'original' || filters.brightness !== 0 || filters.contrast !== 0
}

/* ------------------------------- capture ------------------------------- */

/** Grabs the current camera frame at (up to) its native resolution. */
export function canvasFromVideo(video: HTMLVideoElement, maxWidth = 2400): HTMLCanvasElement {
  const sourceWidth = video.videoWidth || 1280
  const sourceHeight = video.videoHeight || 720
  const scale = Math.min(1, maxWidth / sourceWidth)
  const canvas = makeCanvas(sourceWidth * scale, sourceHeight * scale)
  const context = canvas.getContext('2d')!
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Loads a picked photo/gallery image into a canvas, downscaled for memory. */
export async function canvasFromFile(file: File, maxWidth = 2400): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Could not read that image'))
      element.src = url
    })
    const scale = Math.min(1, maxWidth / image.naturalWidth)
    const canvas = makeCanvas(image.naturalWidth * scale, image.naturalHeight * scale)
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas
  }
  finally {
    URL.revokeObjectURL(url)
  }
}

/* ------------------------------- geometry ------------------------------- */

export function rotateCanvas(source: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const angle = ((degrees % 360) + 360) % 360
  if (angle === 0) return source

  const swap = angle === 90 || angle === 270
  const canvas = makeCanvas(swap ? source.height : source.width, swap ? source.width : source.height)
  const context = canvas.getContext('2d')!
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate((angle * Math.PI) / 180)
  context.drawImage(source, -source.width / 2, -source.height / 2)
  return canvas
}

export function cropCanvas(source: HTMLCanvasElement, rect: Rect): HTMLCanvasElement {
  const x = Math.round(rect.x * source.width)
  const y = Math.round(rect.y * source.height)
  const w = Math.max(8, Math.round(rect.w * source.width))
  const h = Math.max(8, Math.round(rect.h * source.height))
  const canvas = makeCanvas(w, h)
  const context = canvas.getContext('2d')!
  context.drawImage(source, x, y, w, h, 0, 0, w, h)
  return canvas
}

/* -------------------------------- filters -------------------------------- */

function cssFilter(filters: ScanFilters) {
  const parts: string[] = []
  const brightness = 1 + filters.brightness / 100
  const contrast = 1 + filters.contrast / 100
  if (brightness !== 1) parts.push(`brightness(${brightness.toFixed(3)})`)
  if (contrast !== 1) parts.push(`contrast(${contrast.toFixed(3)})`)
  if (filters.mode === 'grayscale') parts.push('grayscale(1)')
  if (filters.mode === 'bw') parts.push('grayscale(1)', 'contrast(1.85)', 'brightness(1.08)')
  if (filters.mode === 'enhance') parts.push('saturate(0.35)')
  return parts.length ? parts.join(' ') : 'none'
}

/** Applies the colour pipeline + returns a fresh canvas (never mutates input). */
export function filterCanvas(source: HTMLCanvasElement, filters: ScanFilters): HTMLCanvasElement {
  const canvas = makeCanvas(source.width, source.height)
  const context = canvas.getContext('2d')!
  // `ctx.filter` is supported by the Android WebView (Chromium) and by browsers.
  try {
    context.filter = cssFilter(filters)
  }
  catch {
    // Older engines: fall through and draw unfiltered rather than throwing.
  }
  context.drawImage(source, 0, 0)
  context.filter = 'none'

  if (filters.mode === 'bw') thresholdInPlace(canvas, 0.62)
  return canvas
}

/**
 * Converts to pure black & white using an adaptive threshold so scans of
 * slightly grey paper still come out clean.
 */
function thresholdInPlace(canvas: HTMLCanvasElement, ratio: number) {
  const context = canvas.getContext('2d')!
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  let total = 0
  for (let i = 0; i < data.length; i += 4) {
    total += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
  }
  const mean = total / (data.length / 4)
  const threshold = Math.min(235, Math.max(110, mean * ratio + (1 - ratio) * 140))
  for (let i = 0; i < data.length; i += 4) {
    const luminance = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
    const value = luminance > threshold ? 255 : 0
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
  }
  context.putImageData(image, 0, 0)
}

/* ------------------------------ auto-framing ------------------------------ */

export interface Point { x: number, y: number }
export interface PageQuad { topLeft: Point, topRight: Point, bottomRight: Point, bottomLeft: Point }

/**
 * Finds the largest bright, connected paper region. Unlike a bounding-box
 * detector, this also estimates all four corners so a page photographed at an
 * angle can be perspective-corrected before it is uploaded.
 */
export function detectPageQuad(source: HTMLCanvasElement): PageQuad | null {
  const width = 240
  const height = Math.max(1, Math.round((source.height / source.width) * width))
  const small = makeCanvas(width, height)
  const context = small.getContext('2d')!
  context.drawImage(source, 0, 0, width, height)
  const { data } = context.getImageData(0, 0, width, height)
  const luminance = new Float32Array(width * height)
  let min = 255
  let max = 0
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const value = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
    luminance[p] = value
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  if (max - min < 28) return null

  // Otsu separates white paper from a darker desk in most lighting. The floor
  // prevents a very dark scene from classifying noise as paper.
  const threshold = Math.max(145, Math.min(225, otsuThreshold(luminance, min, max)))
  const bright = new Uint8Array(width * height)
  for (let i = 0; i < luminance.length; i++) bright[i] = luminance[i] >= threshold ? 1 : 0

  // Close tiny gaps caused by text/shadows, then keep only the largest region.
  for (let pass = 0; pass < 2; pass++) {
    const copy = bright.slice()
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      let neighbours = 0
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) neighbours += copy[i + oy * width + ox]
      bright[i] = neighbours >= 5 ? 1 : 0
    }
  }

  const seen = new Uint8Array(width * height)
  let best: number[] = []
  for (let start = 0; start < bright.length; start++) {
    if (!bright[start] || seen[start]) continue
    const component: number[] = [start]
    seen[start] = 1
    for (let cursor = 0; cursor < component.length; cursor++) {
      const index = component[cursor]
      const x = index % width
      const y = Math.floor(index / width)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx
        const ny = y + dy
        const next = ny * width + nx
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && bright[next] && !seen[next]) {
          seen[next] = 1
          component.push(next)
        }
      }
    }
    if (component.length > best.length) best = component
  }

  const area = best.length / (width * height)
  if (area < 0.12 || area > 0.96) return null
  const points = best.map(index => ({ x: index % width, y: Math.floor(index / width) }))
  // Reduce the component to the four extreme corners. Averaging a small
  // neighbourhood makes the result stable instead of chasing single pixels.
  const extremes = (score: (point: Point) => number, highest = false) => {
    const sorted = [...points].sort((a, b) => highest ? score(b) - score(a) : score(a) - score(b))
    const count = Math.max(4, Math.round(points.length * 0.012))
    return sorted.slice(0, count).reduce((sum, point) => ({ x: sum.x + point.x / count, y: sum.y + point.y / count }), { x: 0, y: 0 })
  }
  const topLeft = extremes(point => point.x + point.y)
  const bottomRight = extremes(point => point.x + point.y, true)
  const topRight = extremes(point => point.x - point.y, true)
  const bottomLeft = extremes(point => point.x - point.y)
  const quad = {
    topLeft: { x: topLeft.x / width, y: topLeft.y / height },
    topRight: { x: topRight.x / width, y: topRight.y / height },
    bottomRight: { x: bottomRight.x / width, y: bottomRight.y / height },
    bottomLeft: { x: bottomLeft.x / width, y: bottomLeft.y / height },
  }
  const quadArea = Math.abs(polygonArea(Object.values(quad)))
  if (quadArea < 0.12 || quadArea > 0.98) return null

  // Bright segmentation often stops a few pixels inside a paper edge because
  // of shadows and anti-aliased borders. Expand around the detected centroid
  // slightly so the crop never clips text near the edge. The later perspective
  // warp still removes the surrounding desk/background.
  const center = Object.values(quad).reduce(
    (sum, point) => ({ x: sum.x + point.x / 4, y: sum.y + point.y / 4 }),
    { x: 0, y: 0 },
  )
  const padding = 1.075
  for (const point of Object.values(quad)) {
    point.x = Math.max(0.003, Math.min(0.997, center.x + (point.x - center.x) * padding))
    point.y = Math.max(0.003, Math.min(0.997, center.y + (point.y - center.y) * padding))
  }
  // The bright-paper mask is routinely several centimetres below the real
  // top edge: the phone shadow, a dark table border, and printed text all make
  // the first part of the sheet fail the brightness threshold. Compensate in
  // image space rather than only subtracting a fixed number of thumbnail
  // pixels. Use the page's detected height so portrait pages get a meaningful
  // top allowance while shallow receipts do not expand into the whole scene.
  const detectedHeight = Math.max(
    quad.bottomLeft.y - quad.topLeft.y,
    quad.bottomRight.y - quad.topRight.y,
  )
  const topAllowance = Math.min(0.18, Math.max(0.075, detectedHeight * 0.12))
  quad.topLeft.y = Math.max(0.003, quad.topLeft.y - topAllowance)
  quad.topRight.y = Math.max(0.003, quad.topRight.y - topAllowance)

  // Keep the top edge ordered and inside the source even when the page is
  // nearly touching the camera frame. This is important for the perspective
  // mapper: inverted or crossing corners produce a black warped canvas.
  quad.topLeft.y = Math.min(quad.topLeft.y, quad.bottomLeft.y - 0.04)
  quad.topRight.y = Math.min(quad.topRight.y, quad.bottomRight.y - 0.04)
  return quad
}

function polygonArea(points: Point[]) {
  return points.reduce((sum, point, i) => {
    const next = points[(i + 1) % points.length]
    return sum + point.x * next.y - next.x * point.y
  }, 0) / 2
}

/** Perspective-corrects a quadrilateral into a clean rectangular scan. */
export function warpPage(source: HTMLCanvasElement, quad: PageQuad): HTMLCanvasElement {
  const distance = (a: Point, b: Point) => Math.hypot((b.x - a.x) * source.width, (b.y - a.y) * source.height)
  const width = Math.min(2400, Math.max(480, Math.round(Math.max(distance(quad.topLeft, quad.topRight), distance(quad.bottomLeft, quad.bottomRight)))))
  const height = Math.min(3400, Math.max(640, Math.round(Math.max(distance(quad.topLeft, quad.bottomLeft), distance(quad.topRight, quad.bottomRight)))))
  const output = makeCanvas(width, height)
  const src = source.getContext('2d')!.getImageData(0, 0, source.width, source.height)
  const dst = output.getContext('2d')!.createImageData(width, height)
  const p = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft]
  const h = homographyToQuad(p)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / Math.max(1, width - 1)
    const v = y / Math.max(1, height - 1)
    const denominator = h[6] * u + h[7] * v + 1
    const sx = (h[0] * u + h[1] * v + h[2]) / denominator * source.width
    const sy = (h[3] * u + h[4] * v + h[5]) / denominator * source.height
    const dx = Math.max(0, Math.min(source.width - 1, sx))
    const dy = Math.max(0, Math.min(source.height - 1, sy))
    const x0 = Math.floor(dx), y0 = Math.floor(dy)
    const x1 = Math.min(source.width - 1, x0 + 1), y1 = Math.min(source.height - 1, y0 + 1)
    const fx = dx - x0, fy = dy - y0
    const outputIndex = (y * width + x) * 4
    for (let channel = 0; channel < 4; channel++) {
      const top = src[(y0 * source.width + x0) * 4 + channel] * (1 - fx) + src[(y0 * source.width + x1) * 4 + channel] * fx
      const bottom = src[(y1 * source.width + x0) * 4 + channel] * (1 - fx) + src[(y1 * source.width + x1) * 4 + channel] * fx
      dst.data[outputIndex + channel] = top * (1 - fy) + bottom * fy
    }
  }
  output.getContext('2d')!.putImageData(dst, 0, 0)

  // Never let a failed/degenerate homography produce a black review page.
  // This can happen when the camera sees a page edge-on or when a connected
  // component collapses to nearly one line. Fall back to a safe rectangular
  // crop (or the original frame) instead of returning unusable pixels.
  const sourceMean = averageLuminance(source)
  const outputMean = averageLuminance(output)
  if (outputMean < 8 || (sourceMean > 18 && outputMean < sourceMean * 0.16)) {
    const points = Object.values(quad)
    const x = Math.max(0, Math.min(...points.map(point => point.x)))
    const y = Math.max(0, Math.min(...points.map(point => point.y)))
    const right = Math.min(1, Math.max(...points.map(point => point.x)))
    const bottom = Math.min(1, Math.max(...points.map(point => point.y)))
    if (right - x > 0.2 && bottom - y > 0.2) return cropCanvas(source, { x, y, w: right - x, h: bottom - y })
    return source
  }
  return output
}

function averageLuminance(canvas: HTMLCanvasElement) {
  const sample = makeCanvas(32, Math.max(8, Math.round((canvas.height / canvas.width) * 32)))
  const context = sample.getContext('2d')!
  context.drawImage(canvas, 0, 0, sample.width, sample.height)
  const data = context.getImageData(0, 0, sample.width, sample.height).data
  let total = 0
  for (let i = 0; i < data.length; i += 4) total += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
  return total / Math.max(1, data.length / 4)
}

function homographyToQuad(points: Point[]) {
  const matrix: number[][] = []
  const values: number[] = []
  const source = [[0, 0], [1, 0], [1, 1], [0, 1]]
  for (let i = 0; i < 4; i++) {
    const [u, v] = source[i]
    const { x, y } = points[i]
    matrix.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); values.push(x)
    matrix.push([0, 0, 0, u, v, 1, -u * y, -v * y]); values.push(y)
  }
  for (let i = 0; i < 8; i++) {
    let pivot = i
    for (let row = i + 1; row < 8; row++) if (Math.abs(matrix[row][i]) > Math.abs(matrix[pivot][i])) pivot = row
    ;[matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]]
    ;[values[i], values[pivot]] = [values[pivot], values[i]]
    const divisor = matrix[i][i] || 1e-9
    for (let col = i; col < 8; col++) matrix[i][col] /= divisor
    values[i] /= divisor
    for (let row = 0; row < 8; row++) if (row !== i) {
      const factor = matrix[row][i]
      for (let col = i; col < 8; col++) matrix[row][col] -= factor * matrix[i][col]
      values[row] -= factor * values[i]
    }
  }
  return [...values, 1]
}

/** Rectangular fallback for low-light or edge-on shots. */
export function detectPageRect(source: HTMLCanvasElement): Rect {
  const quad = detectPageQuad(source)
  if (quad) {
    const points = Object.values(quad)
    const x = Math.min(...points.map(point => point.x))
    const y = Math.min(...points.map(point => point.y))
    const right = Math.max(...points.map(point => point.x))
    const bottom = Math.max(...points.map(point => point.y))
    return { x, y, w: right - x, h: bottom - y }
  }
  return FULL_RECT
}

function otsuThreshold(values: Float32Array, min: number, max: number) {
  const bins = 256
  const histogram = new Int32Array(bins)
  const scale = (bins - 1) / Math.max(1, max - min)
  for (const value of values) histogram[Math.round((value - min) * scale)]++

  const total = values.length
  let sum = 0
  for (let i = 0; i < bins; i++) sum += i * histogram[i]

  let sumBackground = 0
  let weightBackground = 0
  let best = 0
  let bestVariance = -1
  for (let i = 0; i < bins; i++) {
    weightBackground += histogram[i]
    if (weightBackground === 0) continue
    const weightForeground = total - weightBackground
    if (weightForeground === 0) break
    sumBackground += i * histogram[i]
    const meanBackground = sumBackground / weightBackground
    const meanForeground = (sum - sumBackground) / weightForeground
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2
    if (variance > bestVariance) {
      bestVariance = variance
      best = i
    }
  }
  return min + best / scale
}

/* -------------------------------- exporting -------------------------------- */

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), type, quality)
  })
}

export async function canvasToJpegBytes(canvas: HTMLCanvasElement, quality = 0.9) {
  const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  return new Uint8Array(await blob.arrayBuffer())
}

/** A4 at 72 dpi, the usual "scanned page" geometry. */
const A4 = { width: 595.28, height: 841.89 }

/**
 * Builds a multi-page PDF from processed page images. Pages are laid out on A4
 * (rotated to landscape when the scan is), scaled to fit with a thin margin.
 */
export async function buildScanPdf(canvases: HTMLCanvasElement[]): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  pdf.setProducer('Neelas Scanner')
  pdf.setCreator('Neelas Scanner')

  const margin = 12

  for (const canvas of canvases) {
    const jpeg = await canvasToJpegBytes(canvas)
    const embedded = await pdf.embedJpg(jpeg)

    const landscape = embedded.width > embedded.height
    const pageWidth = landscape ? A4.height : A4.width
    const pageHeight = landscape ? A4.width : A4.height
    const page = pdf.addPage([pageWidth, pageHeight])

    const maxWidth = pageWidth - margin * 2
    const maxHeight = pageHeight - margin * 2
    const scale = Math.min(maxWidth / embedded.width, maxHeight / embedded.height)
    const width = embedded.width * scale
    const height = embedded.height * scale

    page.drawImage(embedded, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    })
  }

  return pdf.save()
}

export function scanFileName(name: string) {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').slice(0, 80)
  const base = cleaned || `Scan ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
  return /\.pdf$/i.test(base) ? base : `${base}.pdf`
}
