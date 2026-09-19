<script setup lang="ts">
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import { fetchDocumentFile, getDocument, updateDocument, uploadDocument } from '@/api/client'
import { openPdf, renderPdfPageToCanvas, type OpenPdf } from '@/utils/pdf'
import { useConnectionStore } from '@/stores/app'
import type { PapraDocument } from '@/types/papra'

/**
 * Markup & Sign — open a PDF, drop text notes, pins, signatures and images on
 * it, arrange them (drag / nudge / resize / delete), then save a flattened copy
 * as a new document in Papra. The original is never modified.
 *
 * Rendering: pdf.js draws each page to a canvas. Annotations are absolutely
 * positioned overlays in page coordinates (percent based, so they survive
 * zooming). Saving: pdf-lib re-creates each page at its original size, draws the
 * annotations with StandardFonts, embeds signature/image PNGs, and flattens
 * everything into a new PDF file.
 */

const route = useRoute()
const router = useRouter()
const toast = useToast()
const connectionStore = useConnectionStore()

const orgId = computed(() => connectionStore.activeOrganizationId!)
const documentId = computed(() => String(route.params.id))

const document = ref<PapraDocument | null>(null)
const isLoading = ref(true)
const isRendering = ref(false)
const renderError = ref<string | null>(null)
const renderErrorStack = ref<string | null>(null)

/** Records an error for both the UI and the on-screen stack readout. */
function setRenderError(error: unknown, fallback: string) {
  renderError.value = error instanceof Error ? error.message : fallback
  renderErrorStack.value = error instanceof Error ? (error.stack ?? null) : null
}

/* ------------------------------ pdf state ------------------------------ */

/**
 * MUST be a shallowRef, never a plain ref: pdf.js classes rely on ES private
 * fields, and Vue's deep `ref` wraps the object in a reactive Proxy. Private
 * field access through a Proxy throws
 * "Cannot read private member #s from an object whose class did not declare it".
 */
const pdfDoc = shallowRef<any>(null)
const pageCanvases = ref<HTMLCanvasElement[]>([])
const pageHost = ref<HTMLElement | null>(null)

/** Handle owning the pdf.js worker; destroying it frees the worker thread. */
let openedPdf: OpenPdf | null = null

type AnnotationKind = 'text' | 'pin' | 'signature' | 'image'

interface Annotation {
  id: string
  page: number // 1-based
  xPct: number // 0..100 of page width (left edge)
  yPct: number // 0..100 of page height (top-left origin)
  text: string
  kind: AnnotationKind
  dataUrl?: string // signature / image png
  widthPct?: number // overlay width as % of the page width (signature & image)
  scale?: number // font scale for text & pin
}

const annotations = ref<Annotation[]>([])
const selectedAnnotationId = ref<string | null>(null)

const DEFAULT_WIDTH: Record<'signature' | 'image', number> = { signature: 30, image: 45 }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function newId() {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/* ------------------------------ zoom & pan ------------------------------ */

const MIN_ZOOM = 0.6
const MAX_ZOOM = 4
const zoom = ref(1)

/** CSS `zoom` keeps layout, scrolling (pan) and our %-based overlays in sync. */
const zoomStyle = computed(() => ({ zoom: String(zoom.value) }))
const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`)

function zoomBy(delta: number) {
  zoom.value = Math.round(clamp(zoom.value + delta, MIN_ZOOM, MAX_ZOOM) * 20) / 20
}

function resetZoom() {
  zoom.value = 1
}

/* Pinch-to-zoom (two fingers) — one finger still pans via native scrolling. */
let pinchStart: { distance: number, zoom: number } | null = null

function touchDistance(event: TouchEvent) {
  const [a, b] = [event.touches[0], event.touches[1]]
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function onTouchStart(event: TouchEvent) {
  if (event.touches.length === 2) {
    pinchStart = { distance: touchDistance(event) || 1, zoom: zoom.value }
  }
}

function onTouchMove(event: TouchEvent) {
  if (!pinchStart || event.touches.length !== 2) return
  event.preventDefault()
  zoom.value = clamp(pinchStart.zoom * (touchDistance(event) / pinchStart.distance), MIN_ZOOM, MAX_ZOOM)
}

function onTouchEnd() {
  pinchStart = null
}

/* ------------------------------ toolbar ------------------------------ */

type Tool = 'none' | AnnotationKind
const activeTool = ref<Tool>('none')

const TOOLS: { id: Exclude<Tool, 'none'>, icon: string, label: string }[] = [
  { id: 'text', icon: 'i-lucide-type', label: 'Text' },
  { id: 'pin', icon: 'i-lucide-map-pin', label: 'Pin' },
  { id: 'signature', icon: 'i-lucide-pen-line', label: 'Sign' },
  { id: 'image', icon: 'i-lucide-image-plus', label: 'Image' },
]

/* ------------------------------ image picker ------------------------------ */

const imageInput = ref<HTMLInputElement | null>(null)
const pendingImagePoint = ref<{ page: number, xPct: number, yPct: number } | null>(null)
const isPreparingImage = ref(false)

function pickImage() {
  imageInput.value?.click()
}

/**
 * Normalises any picked picture to a downscaled PNG data URL.
 * A canvas round-trip guarantees pdf-lib can embed it (webp/heic would fail)
 * and keeps the uploaded copy small.
 */
async function normaliseImage(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read that image'))
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Unsupported image format'))
    el.src = raw
  })

  const maxSide = 1600
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
  const canvas = window.document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

async function onImagePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const target = pendingImagePoint.value
  isPreparingImage.value = true
  try {
    const dataUrl = await normaliseImage(file)
    const annotation: Annotation = {
      id: newId(),
      page: target?.page ?? 1,
      xPct: target?.xPct ?? 10,
      yPct: target?.yPct ?? 10,
      text: file.name,
      kind: 'image',
      dataUrl,
      widthPct: DEFAULT_WIDTH.image,
    }
    annotations.value.push(annotation)
    selectedAnnotationId.value = annotation.id
    activeTool.value = 'none'
    toast.add({ title: 'Image added', description: 'Drag or use the arrows to position it.', color: 'success' })
  }
  catch (error) {
    toast.add({
      title: 'Could not add that image',
      description: error instanceof Error ? error.message : undefined,
      color: 'error',
    })
  }
  finally {
    isPreparingImage.value = false
    pendingImagePoint.value = null
  }
}

/* ------------------------------ signature pad ------------------------------ */

const isSignOpen = ref(false)
const signCanvas = ref<HTMLCanvasElement | null>(null)
const hasInk = ref(false)
let isDrawing = false
let lastPoint: { x: number, y: number } | null = null

type SignMode = 'draw' | 'type'
const signMode = ref<SignMode>('draw')
const typedSignatureText = ref('')
const hasStoredSignature = ref(false)
const storedSignatureDataUrl = ref<string | null>(null)

const editingAnnotation = ref<Annotation | null>(null)
const isEditOpen = ref(false)
const draftText = ref('')

const isSaving = ref(false)

onMounted(async () => {
  try {
    const { getDocument: fetchDoc } = await import('@/api/client')
    document.value = await fetchDoc(orgId.value, documentId.value)
    await loadPdf()
  }
  catch (error) {
    setRenderError(error, 'Failed to load document')
  }
  finally {
    isLoading.value = false
  }
})

onBeforeUnmount(() => {
  openedPdf?.destroy()
  openedPdf = null
})

async function loadPdf() {
  if (!document.value) return
  isRendering.value = true
  renderError.value = null
  try {
    let bytes: Uint8Array
    try {
      bytes = await fetchDocumentFile(orgId.value, documentId.value)
    }
    catch (error) {
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'unknown'}`)
    }

    try {
      const opened = await openPdf(bytes)
      openedPdf = opened
      pdfDoc.value = markRaw(opened.pdf)
    }
    catch (error) {
      throw new Error(`PDF parse failed: ${error instanceof Error ? error.message : 'unknown'}`)
    }

    await nextTick()
    await renderAllPages()
  }
  catch (error) {
    setRenderError(error, 'Could not render this PDF')
  }
  finally {
    isRendering.value = false
  }
}

async function renderAllPages() {
  const host = pageHost.value
  const pdf = pdfDoc.value
  if (!host || !pdf) return

  // The host is CSS-zoomed, so divide the layout width back out
  const containerWidth = (host.clientWidth || 360) / zoom.value
  const canvases: HTMLCanvasElement[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const canvas = await renderPdfPageToCanvas(page, containerWidth)
    canvas.dataset.page = String(pageNumber)
    canvases.push(canvas)
  }

  pageCanvases.value = canvases
}

/* ------------------------------ placing marks ------------------------------ */

/**
 * Host-level delegation: ONE listener on the scroll container for every page.
 * Taps land on the canvas (or page wrapper) and bubble here — immune to
 * overlays/edges and to listeners being re-bound per page.
 */
function handlePageTapDelegated(event: Event) {
  const target = event.target as HTMLElement
  const pageEl = target?.closest?.('[data-page]') as HTMLElement | null
  // Taps on a mark select it (its own handler); taps on chrome do nothing.
  if (!pageEl) {
    if (!target?.closest?.('[data-annotation], button, input, [role="button"]')) {
      selectedAnnotationId.value = null
    }
    return
  }
  if (target?.closest?.('[data-annotation]')) return
  if (activeTool.value === 'none') {
    selectedAnnotationId.value = null
    return
  }
  placeMarkAt(pageEl, getEventPoint(event, pageEl))
}

/** Extracts the tap point as page-relative percentages. */
function getEventPoint(event: Event, pageEl: HTMLElement) {
  const rect = pageEl.getBoundingClientRect()
  const mouse = event as MouseEvent
  // A11y/keyboard activation has no coordinates → use the page center.
  if (mouse.clientX === undefined || (mouse.clientX === 0 && mouse.clientY === 0)) {
    return { xPct: 50, yPct: 50 }
  }
  return {
    xPct: clamp(((mouse.clientX - rect.left) / rect.width) * 100, 1, 90),
    yPct: clamp(((mouse.clientY - rect.top) / rect.height) * 100, 1, 95),
  }
}

function placeMarkAt(pageEl: HTMLElement, point: { xPct: number, yPct: number }) {
  const pageNumber = Number(pageEl.dataset.page)
  if (!pageNumber || activeTool.value === 'none') return

  if (activeTool.value === 'signature') {
    pendingSignature.value = { page: pageNumber, xPct: point.xPct, yPct: point.yPct }
    openSignPad()
    return
  }

  if (activeTool.value === 'image') {
    pendingImagePoint.value = { page: pageNumber, xPct: point.xPct, yPct: point.yPct }
    pickImage()
    return
  }

  const annotation: Annotation = {
    id: newId(),
    page: pageNumber,
    xPct: point.xPct,
    yPct: point.yPct,
    text: '',
    kind: activeTool.value as 'text' | 'pin',
    scale: 1,
  }
  annotations.value.push(annotation)
  selectedAnnotationId.value = annotation.id
  activeTool.value = 'none'

  if (annotation.kind === 'text') {
    editingAnnotation.value = annotation
    draftText.value = ''
    isEditOpen.value = true
  }
}

/* ------------------------------ editing marks ------------------------------ */

function isSelected(annotation: Annotation) {
  return selectedAnnotationId.value === annotation.id
}

/** Set by a drag so the click that follows a drag cannot toggle selection off. */
let justDragged = false

function selectAnnotation(annotation: Annotation) {
  if (justDragged) {
    justDragged = false
    return
  }
  selectedAnnotationId.value = selectedAnnotationId.value === annotation.id ? null : annotation.id
}

function editAnnotation(annotation: Annotation) {
  editingAnnotation.value = annotation
  draftText.value = annotation.text
  isEditOpen.value = true
}

function saveAnnotationText() {
  const annotation = editingAnnotation.value
  if (!annotation) return
  const text = draftText.value.trim()
  if (!text) {
    removeAnnotation(annotation)
  }
  else {
    annotation.text = text
  }
  isEditOpen.value = false
  editingAnnotation.value = null
}

function removeAnnotation(annotation: Annotation) {
  annotations.value = annotations.value.filter(candidate => candidate.id !== annotation.id)
  if (selectedAnnotationId.value === annotation.id) selectedAnnotationId.value = null
}

function clearAllAnnotations() {
  annotations.value = []
  selectedAnnotationId.value = null
}

/** Moves the selected mark by a page-percent delta (arrow buttons). */
function nudge(dx: number, dy: number) {
  const annotation = selectedAnnotation.value
  if (!annotation) return
  annotation.xPct = clamp(annotation.xPct + dx, 0, 98)
  annotation.yPct = clamp(annotation.yPct + dy, 0, 98)
}

function annotationWidth(annotation: Annotation) {
  return annotation.widthPct ?? DEFAULT_WIDTH[annotation.kind as 'signature' | 'image'] ?? 30
}

function annotationScale(annotation: Annotation) {
  return annotation.scale ?? 1
}

/** −/+ buttons: resize stamps/images, or scale text & pin boxes. */
function resizeSelected(delta: number) {
  const annotation = selectedAnnotation.value
  if (!annotation) return
  if (annotation.kind === 'signature' || annotation.kind === 'image') {
    annotation.widthPct = Math.round(clamp(annotationWidth(annotation) + delta, 8, 100))
    return
  }
  annotation.scale = Math.round(clamp(annotationScale(annotation) + delta / 20, 0.6, 2.4) * 100) / 100
}

/* Drag to reposition ------------------------------------------------ */

let dragState: {
  id: string
  pageEl: HTMLElement
  grabX: number
  grabY: number
  moved: boolean
} | null = null

function startDrag(event: PointerEvent, annotation: Annotation) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (activeTool.value !== 'none') return
  const element = event.currentTarget as HTMLElement | null
  const pageEl = element?.closest?.('[data-page]') as HTMLElement | null
  if (!element || !pageEl) return

  const rect = pageEl.getBoundingClientRect()
  dragState = {
    id: annotation.id,
    pageEl,
    // Remember where inside the mark the finger grabbed it
    grabX: ((event.clientX - rect.left) / rect.width) * 100 - annotation.xPct,
    grabY: ((event.clientY - rect.top) / rect.height) * 100 - annotation.yPct,
    moved: false,
  }
  try {
    element.setPointerCapture(event.pointerId)
  }
  catch {
    // Pointer capture is a nicety; the move handler still fires without it
  }
}

function onDragMove(event: PointerEvent) {
  if (!dragState) return
  const annotation = annotations.value.find(candidate => candidate.id === dragState!.id)
  if (!annotation) return
  event.preventDefault()
  const rect = dragState.pageEl.getBoundingClientRect()
  annotation.xPct = clamp(((event.clientX - rect.left) / rect.width) * 100 - dragState.grabX, 0, 98)
  annotation.yPct = clamp(((event.clientY - rect.top) / rect.height) * 100 - dragState.grabY, 0, 97)
  dragState.moved = true
  selectedAnnotationId.value = annotation.id
}

function endDrag(event: PointerEvent) {
  if (dragState?.moved) justDragged = true
  const element = event.currentTarget as HTMLElement | null
  try {
    if (element?.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId)
  }
  catch {
    // ignore
  }
  dragState = null
}

/* ------------------------------ signature pad logic ------------------------------ */

const pendingSignature = ref<{ page: number, xPct: number, yPct: number } | null>(null)

function openSignPad() {
  isSignOpen.value = true
  hasInk.value = false
  if (!hasStoredSignature.value) {
    typedSignatureText.value = ''
    signMode.value = 'draw'
  }
  const setupPad = () => {
    const canvas = signCanvas.value
    if (!canvas || canvas.clientWidth === 0) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * ratio
    canvas.height = canvas.clientHeight * ratio
    const context = canvas.getContext('2d')!
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.lineWidth = 2.4
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#0f172a'
  }
  nextTick(() => {
    setupPad()
    // If the modal was still animating in, retry once it has layout
    setTimeout(() => {
      if (signMode.value === 'draw' && signCanvas.value && signCanvas.value.width === 0) setupPad()
    }, 250)
  })
}

function signPointerDown(event: PointerEvent) {
  const canvas = signCanvas.value!
  const rect = canvas.getBoundingClientRect()
  isDrawing = true
  lastPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  // Keep receiving moves even if the finger drifts off the canvas
  try {
    canvas.setPointerCapture(event.pointerId)
  }
  catch {
    // ignore
  }
}

function signPointerMove(event: PointerEvent) {
  if (!isDrawing || !lastPoint) return
  const canvas = signCanvas.value!
  const rect = canvas.getBoundingClientRect()
  const context = canvas.getContext('2d')!
  const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  context.beginPath()
  context.moveTo(lastPoint.x, lastPoint.y)
  context.lineTo(point.x, point.y)
  context.stroke()
  lastPoint = point
  hasInk.value = true
}

function signPointerUp() {
  isDrawing = false
  lastPoint = null
}

function clearSignature() {
  const canvas = signCanvas.value
  if (!canvas) return
  const context = canvas.getContext('2d')!
  context.clearRect(0, 0, canvas.width, canvas.height)
  hasInk.value = false
}

async function confirmSignature() {
  if (signMode.value === 'type') {
    const text = typedSignatureText.value.trim()
    if (!text) return
    const dataUrl = await renderTypedSignature(text)
    commitSignature(dataUrl)
    return
  }
  const canvas = signCanvas.value
  if (!canvas || !hasInk.value) return

  // Trim transparent margins so the stamp sits tight on the page
  commitSignature(trimCanvas(canvas).toDataURL('image/png'))
}

function commitSignature(dataUrl: string) {
  const target = pendingSignature.value
  if (!target) return

  storedSignatureDataUrl.value = dataUrl
  hasStoredSignature.value = true

  const annotation: Annotation = {
    id: newId(),
    page: target.page,
    xPct: target.xPct,
    yPct: target.yPct,
    text: 'Signature',
    kind: 'signature',
    dataUrl,
    widthPct: DEFAULT_WIDTH.signature,
  }
  annotations.value.push(annotation)
  selectedAnnotationId.value = annotation.id
  pendingSignature.value = null
  activeTool.value = 'none'
  isSignOpen.value = false
}

/** Renders typed text as a handwritten-style signature PNG (script font). */
async function renderTypedSignature(text: string): Promise<string> {
  const { default: fabricUrl } = await import('@fontsource/caveat/files/caveat-latin-700-normal.woff2?url')
  await new Promise<void>((resolve, reject) => {
    const font = new FontFace('SignatureScript', `url(${fabricUrl})`)
    font.load()
      .then(loaded => {
        (window.document as any).fonts.add(loaded)
        resolve()
      })
      .catch(reject)
  })

  const ratio = 3
  const pad = 24
  const measure = window.document.createElement('canvas').getContext('2d')!
  measure.font = '700 44px "SignatureScript", cursive'
  const textWidth = measure.measureText(text).width

  const canvas = window.document.createElement('canvas')
  canvas.width = Math.ceil((textWidth + pad * 2) * ratio)
  canvas.height = Math.ceil(76 * ratio)
  const context = canvas.getContext('2d')!
  context.scale(ratio, ratio)
  context.font = '700 44px "SignatureScript", cursive'
  context.fillStyle = '#0f172a'
  context.textBaseline = 'middle'
  context.fillText(text, pad, canvas.height / ratio / 2)

  return trimCanvas(canvas).toDataURL('image/png')
}

function trimCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const context = source.getContext('2d')!
  const { width, height } = source
  const data = context.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (minX > maxX || minY > maxY) return source
  const padding = 6
  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = Math.min(width - 1, maxX + padding)
  maxY = Math.min(height - 1, maxY + padding)
  const trimmed = window.document.createElement('canvas')
  trimmed.width = maxX - minX + 1
  trimmed.height = maxY - minY + 1
  trimmed.getContext('2d')!.drawImage(source, minX, minY, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height)
  return trimmed
}

/* ------------------------------ saving ------------------------------ */

async function saveSignedCopy() {
  if (!document.value || !pdfDoc.value || annotations.value.length === 0) return
  isSaving.value = true
  try {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')

    // Fresh flattened document: draw page images + annotation overlays
    const out = await PDFDocument.create()
    const font = await out.embedFont(StandardFonts.Helvetica)
    const boldFont = await out.embedFont(StandardFonts.HelveticaBold)

    for (let pageNumber = 1; pageNumber <= pdfDoc.value.numPages; pageNumber++) {
      const page = await pdfDoc.value.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 2 })
      const renderCanvas = window.document.createElement('canvas')
      renderCanvas.width = viewport.width
      renderCanvas.height = viewport.height
      await page.render({ canvas: renderCanvas, canvasContext: renderCanvas.getContext('2d')!, viewport }).promise
      const png = await out.embedPng(renderCanvas.toDataURL('image/png'))

      const pdfPage = out.addPage([viewport.width / 2, viewport.height / 2])
      pdfPage.drawImage(png, { x: 0, y: 0, width: pdfPage.getWidth(), height: pdfPage.getHeight() })

      const pageAnnotations = annotations.value.filter(annotation => annotation.page === pageNumber)
      for (const annotation of pageAnnotations) {
        const x = (annotation.xPct / 100) * pdfPage.getWidth()
        // PDF origin is bottom-left; our overlays use top-left percentages
        const yTop = (annotation.yPct / 100) * pdfPage.getHeight()

        if ((annotation.kind === 'signature' || annotation.kind === 'image') && annotation.dataUrl) {
          const embedded = await out.embedPng(annotation.dataUrl)
          const stampWidth = (annotationWidth(annotation) / 100) * pdfPage.getWidth()
          const stampHeight = (embedded.height / embedded.width) * stampWidth
          pdfPage.drawImage(embedded, {
            x,
            y: pdfPage.getHeight() - yTop - stampHeight,
            width: stampWidth,
            height: stampHeight,
          })
        }
        else {
          const textFont = annotation.kind === 'pin' ? boldFont : font
          const fontSize = (annotation.kind === 'pin' ? 10 : 11) * annotationScale(annotation)
          const lines = wrapText(annotation.text, textFont, fontSize, pdfPage.getWidth() - x - 12)
          const lineHeight = fontSize * 1.3
          const boxHeight = lines.length * lineHeight + 8
          const boxWidth = Math.min(
            pdfPage.getWidth() - x - 8,
            Math.max(...lines.map(line => textFont.widthOfTextAtSize(line, fontSize))) + 12,
          )

          pdfPage.drawRectangle({
            x,
            y: pdfPage.getHeight() - yTop - boxHeight,
            width: boxWidth,
            height: boxHeight,
            color: annotation.kind === 'pin' ? rgb(0.93, 0.42, 0.13) : rgb(1, 0.96, 0.72),
            opacity: 0.95,
          })
          let textY = pdfPage.getHeight() - yTop - 14
          for (const line of lines) {
            pdfPage.drawText(line, { x: x + 6, y: textY, size: fontSize, font: textFont, color: rgb(0.1, 0.1, 0.12) })
            textY -= lineHeight
          }
        }
      }
    }

    const bytes = await out.save()
    const file = new File([bytes], markedCopyName(), { type: 'application/pdf' })
    const uploaded = await uploadDocument(orgId.value, file)

    // Keep the copy discoverable: copy the source document's tags
    try {
      const { addTagToDocument, listTags } = await import('@/api/client')
      const tags = await listTags(orgId.value)
      const sourceTagNames = new Set((document.value.tags ?? []).map(tag => tag.name))
      for (const tag of tags) {
        if (sourceTagNames.has(tag.name)) {
          await addTagToDocument(orgId.value, uploaded.id, tag.id).catch(() => {})
        }
      }
    }
    catch {
      // best effort
    }

    try {
      await updateDocument(orgId.value, uploaded.id, {
        notes: `Marked copy of “${document.value.name}” — created with Markup & Sign.`,
      })
    }
    catch {
      // best effort
    }

    toast.add({ title: 'Marked copy saved', description: uploaded.name, color: 'success' })
    router.replace(`/documents/${uploaded.id}`)
  }
  catch (error) {
    toast.add({
      title: 'Could not save marked copy',
      description: error instanceof Error ? error.message : undefined,
      color: 'error',
    })
  }
  finally {
    isSaving.value = false
  }
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current)
      current = word
    }
    else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function markedCopyName() {
  const base = document.value?.name ?? 'document'
  const withoutExt = base.replace(/\.pdf$/i, '')
  return `${withoutExt} (marked).pdf`
}

/* ------------------------------ template helpers ------------------------------ */

const totalPages = computed(() => pdfDoc.value?.numPages ?? 0)
const canSave = computed(() => annotations.value.length > 0 && !isSaving.value)
const toolStatus = computed(() => activeTool.value === 'none' ? '' : ` · ${activeTool.value}`)
const footerHint = computed(() => {
  if (activeTool.value !== 'none') {
    return activeTool.value === 'image'
      ? 'Tap the page to place an image'
      : `Tool: ${activeTool.value} — tap the page`
  }
  if (selectedAnnotation.value) return 'Drag to move · arrows nudge · 🗑 deletes'
  if (annotations.value.length === 0) return 'Pick Text, Pin, Sign or Image, then tap the page'
  return `${annotations.value.length} mark${annotations.value.length === 1 ? '' : 's'} placed · tap one to edit`
})
const selectedAnnotation = computed(
  () => annotations.value.find(annotation => annotation.id === selectedAnnotationId.value) ?? null,
)

/** Mounts a rendered page canvas into its placeholder element (function ref) */
function mountCanvas(el: HTMLElement | null, canvas: HTMLCanvasElement) {
  if (!el) return
  if (canvas.parentElement !== el) {
    el.appendChild(canvas)
  }
}
</script>

<template>
  <div class="min-h-dvh pb-40">
    <header class="safe-top sticky top-0 z-30 bg-[var(--background)]/95 backdrop-blur-xl">
      <div class="mx-auto flex max-w-lg items-center gap-1 px-2 pt-3 pb-2">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Back"
          @click="router.back()"
        />
        <div class="min-w-0 flex-1 px-1">
          <p class="truncate text-sm font-medium text-[var(--foreground)]">Markup &amp; Sign</p>
          <p class="truncate text-[11px] text-[var(--muted-foreground)]">
            {{ document?.name ?? 'Loading…' }}
          </p>
        </div>
        <UButton
          label="Save copy"
          size="xs"
          :loading="isSaving"
          :disabled="!canSave"
          @click="saveSignedCopy"
        />
      </div>

      <!-- Tool rail -->
      <div class="mx-auto flex max-w-lg items-center gap-2 overflow-x-auto px-4 pb-2">
        <button
          v-for="tool in TOOLS"
          :key="tool.id"
          class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          :class="activeTool === tool.id
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--muted)] text-[var(--foreground)] active:bg-[var(--border-accented)]'"
          :aria-pressed="activeTool === tool.id"
          @click="activeTool = activeTool === tool.id ? 'none' : tool.id"
        >
          <UIcon :name="tool.icon" class="size-3.5" />
          {{ tool.label }}{{ activeTool === tool.id ? ' ✓' : '' }}
        </button>
        <button
          v-if="annotations.length > 0"
          class="ml-1 flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] active:bg-[var(--muted)]"
          aria-label="Clear all marks"
          @click="clearAllAnnotations"
        >
          <UIcon name="i-lucide-eraser" class="size-3.5" />
          Clear
        </button>
        <span class="ml-auto shrink-0 pl-2 text-[11px] text-[var(--muted-foreground)]">
          {{ totalPages }} page{{ totalPages === 1 ? '' : 's' }} · {{ annotations.length }} marks{{ toolStatus }}
        </span>
      </div>
    </header>

    <!-- A single `click` listener: real touches and accessibility clicks both emit
         it, and adding pointerdown too would place two marks per tap. -->
    <main
      class="mx-auto max-w-lg px-3"
      @click="handlePageTapDelegated"
    >
      <div v-if="isLoading || isRendering" class="space-y-3 pt-4">
        <USkeleton class="mx-auto h-96 w-full rounded-xl" />
        <p class="text-center text-xs text-[var(--muted-foreground)]">
          {{ isLoading ? 'Loading document…' : 'Rendering PDF…' }}
        </p>
      </div>

      <div v-if="renderError" class="mt-16 flex flex-col items-center gap-3 text-center">
        <UIcon name="i-lucide-file-x" class="size-10 text-[var(--muted-foreground)]" />
        <p class="text-sm text-[var(--muted-foreground)]">{{ renderError }}</p>
        <pre
          v-if="renderErrorStack"
          class="max-h-56 w-full overflow-auto rounded-lg bg-[var(--muted)] p-2 text-left text-[9px] leading-tight whitespace-pre-wrap break-all text-[var(--muted-foreground)]"
        >{{ renderErrorStack }}</pre>
        <UButton label="Go back" variant="soft" @click="router.back()" />
      </div>

      <!-- Always mounted: renderAllPages() needs this element (and its width)
           while `isRendering` is still true, so it must NOT be inside a v-else.
           Pinch is handled here; one-finger pans by native scrolling. -->
      <div
        ref="pageHost"
        class="relative space-y-4 pt-3"
        :style="{ ...zoomStyle, touchAction: 'pan-x pan-y' }"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchEnd"
      >
        <!-- Each page wrapper carries data-page; taps anywhere on it (canvas included)
             bubble to the host listener above → single robust code path. -->
        <div
          v-for="(canvas, index) in pageCanvases"
          :key="index"
          class="relative overflow-hidden rounded-xl bg-white shadow-lg"
          :class="activeTool === 'none' ? '' : 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)]'"
          :data-page="index + 1"
        >
          <div :ref="el => mountCanvas(el as HTMLElement, canvas)" />

          <!-- Annotation overlays: draggable, selectable, deletable -->
          <div
            v-for="annotation in annotations.filter(a => a.page === index + 1)"
            :key="annotation.id"
            data-annotation
            role="button"
            tabindex="0"
            class="absolute z-10 touch-none select-none"
            :class="isSelected(annotation) ? 'ring-2 ring-[var(--primary)] ring-offset-1' : ''"
            :style="{
              left: `${annotation.xPct}%`,
              top: `${annotation.yPct}%`,
              width: (annotation.kind === 'signature' || annotation.kind === 'image')
                ? `${annotationWidth(annotation)}%`
                : undefined,
            }"
            :aria-label="`${annotation.kind} mark`"
            @pointerdown.stop="startDrag($event, annotation)"
            @pointermove="onDragMove"
            @pointerup="endDrag"
            @pointercancel="endDrag"
            @click.stop="selectAnnotation(annotation)"
          >
            <img
              v-if="(annotation.kind === 'signature' || annotation.kind === 'image') && annotation.dataUrl"
              :src="annotation.dataUrl"
              :alt="annotation.kind === 'signature' ? 'Signature' : annotation.text"
              class="h-auto w-full drop-shadow"
            >
            <span
              v-else-if="annotation.kind === 'pin'"
              class="grid place-items-center rounded-full rounded-bl-none bg-orange-500 text-white shadow"
              :style="{
                width: `${1.5 * annotationScale(annotation)}rem`,
                height: `${1.5 * annotationScale(annotation)}rem`,
                fontSize: `${0.5625 * annotationScale(annotation)}rem`,
              }"
            >
              {{ annotation.text.slice(0, 2) || '•' }}
            </span>
            <span
              v-else
              class="block max-w-48 rounded-md bg-yellow-100 px-1.5 py-0.5 text-left leading-snug text-slate-900 shadow"
              :style="{ fontSize: `${11 * annotationScale(annotation)}px` }"
            >{{ annotation.text || 'Empty text' }}</span>

            <!-- Quick delete handle, always reachable while selected -->
            <button
              v-if="isSelected(annotation)"
              class="absolute -top-3 -right-3 grid size-7 place-items-center rounded-full bg-red-500 text-xs font-bold text-white shadow-lg"
              :aria-label="`Delete ${annotation.kind} mark`"
              @pointerdown.stop
              @click.stop="removeAnnotation(annotation)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Zoom / pan controls -->
      <div
        v-if="!isLoading && !renderError && pageCanvases.length"
        class="fixed top-1/2 right-1.5 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full bg-[var(--foreground)]/92 p-1.5 text-[var(--background)] shadow-xl"
      >
        <button
          class="grid size-9 place-items-center rounded-full text-lg active:bg-white/15"
          aria-label="Zoom in"
          @click="zoomBy(0.25)"
        >
          <UIcon name="i-lucide-plus" class="size-4" />
        </button>
        <button
          class="text-[9px] font-semibold tracking-tight"
          :aria-label="`Reset zoom, currently ${zoomLabel}`"
          @click="resetZoom"
        >
          {{ zoomLabel }}
        </button>
        <button
          class="grid size-9 place-items-center rounded-full text-lg active:bg-white/15"
          aria-label="Zoom out"
          @click="zoomBy(-0.25)"
        >
          <UIcon name="i-lucide-minus" class="size-4" />
        </button>
      </div>

      <!-- Selected mark actions -->
      <div
        v-if="selectedAnnotation"
        class="fixed inset-x-0 bottom-24 z-40 mx-auto w-fit max-w-[95vw]"
      >
        <div class="flex items-center gap-1 rounded-2xl bg-[var(--foreground)] px-2 py-1.5 text-[var(--background)] shadow-2xl">
          <span class="px-1 text-[10px] tracking-wide uppercase opacity-70">{{ selectedAnnotation.kind }}</span>

          <button
            class="grid size-8 place-items-center rounded-lg active:bg-white/15"
            aria-label="Move up"
            @click="nudge(0, -1)"
          >
            <UIcon name="i-lucide-chevron-up" class="size-4" />
          </button>
          <button
            class="grid size-8 place-items-center rounded-lg active:bg-white/15"
            aria-label="Move down"
            @click="nudge(0, 1)"
          >
            <UIcon name="i-lucide-chevron-down" class="size-4" />
          </button>
          <button
            class="grid size-8 place-items-center rounded-lg active:bg-white/15"
            aria-label="Move left"
            @click="nudge(-1, 0)"
          >
            <UIcon name="i-lucide-chevron-left" class="size-4" />
          </button>
          <button
            class="grid size-8 place-items-center rounded-lg active:bg-white/15"
            aria-label="Move right"
            @click="nudge(1, 0)"
          >
            <UIcon name="i-lucide-chevron-right" class="size-4" />
          </button>

          <span class="mx-0.5 h-6 w-px bg-white/20" />

          <button
            class="grid size-8 place-items-center rounded-lg active:bg-white/15"
            aria-label="Make smaller"
            @click="resizeSelected(-4)"
          >
            <UIcon name="i-lucide-minus" class="size-4" />
          </button>
          <button
            class="grid size-8 place-items-center rounded-lg active:bg-white/15"
            aria-label="Make larger"
            @click="resizeSelected(4)"
          >
            <UIcon name="i-lucide-plus" class="size-4" />
          </button>

          <span class="mx-0.5 h-6 w-px bg-white/20" />

          <button
            v-if="selectedAnnotation.kind === 'text' || selectedAnnotation.kind === 'pin'"
            class="grid size-8 place-items-center rounded-lg active:bg-white/15"
            aria-label="Edit text"
            @click="editAnnotation(selectedAnnotation)"
          >
            <UIcon name="i-lucide-pencil" class="size-4" />
          </button>
          <button
            class="grid size-8 place-items-center rounded-lg text-red-400 active:bg-white/15"
            aria-label="Delete mark"
            @click="removeAnnotation(selectedAnnotation)"
          >
            <UIcon name="i-lucide-trash-2" class="size-4" />
          </button>
        </div>
      </div>

      <!-- Hidden picker for Image marks -->
      <input
        ref="imageInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onImagePicked"
      >
    </main>

    <!-- Signature pad modal -->
    <UModal v-model:open="isSignOpen" title="Draw your signature">
      <template #body>
        <div class="space-y-3">
          <!-- Draw / Type switcher -->
          <div class="grid grid-cols-2 gap-1 rounded-full bg-[var(--muted)] p-1">
            <button
              class="rounded-full py-1.5 text-xs font-medium transition-colors"
              :class="signMode === 'draw'
                ? 'bg-[var(--background)] text-[var(--foreground)] shadow'
                : 'text-[var(--muted-foreground)]'"
              @click="signMode = 'draw'"
            >
              ✍️ Draw
            </button>
            <button
              class="rounded-full py-1.5 text-xs font-medium transition-colors"
              :class="signMode === 'type'
                ? 'bg-[var(--background)] text-[var(--foreground)] shadow'
                : 'text-[var(--muted-foreground)]'"
              @click="signMode = 'type'"
            >
              ⌨️ Type
            </button>
          </div>

          <div v-if="signMode === 'draw'" class="rounded-2xl border border-dashed border-[var(--border-accented)] bg-white p-2">
            <canvas
              ref="signCanvas"
              class="h-40 w-full touch-none rounded-xl"
              @pointerdown.prevent="signPointerDown"
              @pointermove.prevent="signPointerMove"
              @pointerup="signPointerUp"
              @pointerleave="signPointerUp"
            />
            <p class="pt-2 text-center text-xs text-[var(--muted-foreground)]">
              Draw above with your finger or stylus
            </p>
          </div>
          <div v-else class="space-y-2">
            <UInput
              v-model="typedSignatureText"
              placeholder="Type your full name…"
              class="w-full"
              @keydown.enter="confirmSignature"
            />
            <div class="grid min-h-24 place-items-center rounded-2xl border border-dashed border-[var(--border-accented)] bg-white px-3">
              <span
                class="text-3xl text-slate-900"
                :style="typedSignatureText ? { fontFamily: 'SignatureScript, cursive', fontWeight: 700 } : {}"
              >
                {{ typedSignatureText || 'Preview appears here' }}
              </span>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full items-center justify-between gap-2">
          <UButton
            label="Clear"
            color="neutral"
            variant="ghost"
            :disabled="signMode === 'type'"
            @click="clearSignature"
          />
          <div class="flex gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="isSignOpen = false; pendingSignature = null" />
            <UButton
              label="Place"
              :disabled="signMode === 'type' ? !typedSignatureText.trim() : !hasInk"
              @click="confirmSignature"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Text edit modal -->
    <UModal v-model:open="isEditOpen" title="Annotation text">
      <template #body>
        <UTextarea
          v-model="draftText"
          :rows="3"
          autofocus
          class="w-full"
          placeholder="Type the note to place on the page…"
          @keydown.enter.exact.prevent="saveAnnotationText"
        />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="isEditOpen = false; editingAnnotation = null" />
          <UButton label="Save" @click="saveAnnotationText" />
        </div>
      </template>
    </UModal>

    <!-- Footer hint (doubles as live tool feedback) -->
    <div
      v-if="!isLoading && !renderError"
      class="pointer-events-none fixed inset-x-0 bottom-24 z-30 mx-auto w-fit max-w-[90vw] rounded-full bg-[var(--foreground)] px-4 py-2 text-center text-xs text-[var(--background)] shadow-lg"
    >
      {{ footerHint }}
    </div>
  </div>
</template>
