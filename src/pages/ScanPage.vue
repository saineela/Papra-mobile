<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import { uploadDocument } from '@/api/client'
import { useConnectionStore } from '@/stores/app'
import {
  buildScanPdf,
  canvasFromFile,
  canvasFromVideo,
  cropCanvas,
  DEFAULT_FILTERS,
  detectPageQuad,
  filterCanvas,
  FULL_RECT,
  IDENTITY_FILTERS,
  warpPage,
  rotateCanvas,
  scanFileName,
  type FilterMode,
  type Rect,
  type ScanFilters,
} from '@/utils/scan'

/**
 * Scan & create — the camera-driven way to add documents.
 *
 * Capture stage: live camera preview (with a gallery fallback), an auto-frame
 * pass that finds the paper on every shot, and a running page counter.
 * Review stage: the page stack — reorder, rotate, delete, re-shoot.
 * Edit stage: rotate / crop / filters / brightness & contrast on one page.
 * Finishing: the pages are flattened into a PDF and uploaded to Papra.
 */

const router = useRouter()
const toast = useToast()
const connectionStore = useConnectionStore()

const orgId = computed(() => connectionStore.activeOrganizationId)

type Stage = 'capture' | 'review' | 'edit'

interface ScanPageItem {
  id: string
  /** Raw capture, kept so "Reset" can always get back to it. */
  original: HTMLCanvasElement
  /** Rotation + crop result — what the filters are applied to. */
  geom: HTMLCanvasElement
  filters: ScanFilters
  /** Small data URL for the review grid. */
  thumb: string
}

const stage = ref<Stage>('capture')
const pages = ref<ScanPageItem[]>([])

/* ------------------------------- camera ------------------------------- */

const videoEl = ref<HTMLVideoElement | null>(null)
const galleryInput = ref<HTMLInputElement | null>(null)

let stream: MediaStream | null = null
const facing = ref<'environment' | 'user'>('environment')
/** Guards against two concurrent getUserMedia calls (double mount / fast taps). */
let starting = false
const cameraReady = ref(false)
const cameraError = ref<string | null>(null)
const torchOn = ref(false)
const torchAvailable = ref(false)
const autoFrame = ref(true)
const autoCapture = ref(true)
const flash = ref(false)
const detectionStatus = ref('Point at a document')
const documentDetected = ref(false)
const stableFrames = ref(0)
let detectionTimer: number | null = null
let captureBusy = false
let lastQuadSignature = ''
let lastAutoCaptureAt = 0

function stopCamera() {
  if (detectionTimer !== null) {
    window.clearTimeout(detectionTimer)
    detectionTimer = null
  }
  stream?.getTracks().forEach(track => track.stop())
  stream = null
  cameraReady.value = false
  torchOn.value = false
  torchAvailable.value = false
  documentDetected.value = false
  stableFrames.value = 0
  detectionStatus.value = 'Point at a document'
}

async function startCamera() {
  if (starting) return
  starting = true
  cameraError.value = null
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'This device cannot open the camera inside the app. Use “From gallery” instead.'
    starting = false
    return
  }
  stopCamera()
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facing.value },
        width: { ideal: 3840 },
        height: { ideal: 2160 },
        // Ask the Android camera HAL for continuous document autofocus. The
        // detector still crops after capture, but this keeps text sharp before
        // the frame is sampled.
        focusMode: { ideal: 'continuous' },
      },
      audio: false,
    })
    await nextTick()
    const video = videoEl.value
    if (!video) {
      stopCamera()
      return
    }
    video.srcObject = stream
    video.setAttribute('playsinline', 'true')
    // A rejected play() means no usable preview; surface it instead of a black box.
    await video.play()
    cameraReady.value = true

    const track = stream.getVideoTracks()[0]
    const capabilities = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
    torchAvailable.value = Boolean(capabilities.torch)
  }
  catch (error) {
    stopCamera()
    cameraError.value = error instanceof Error
      ? `Camera unavailable (${error.name}). Use “From gallery” instead.`
      : 'Camera unavailable. Use “From gallery” instead.'
  }
  finally {
    starting = false
  }
}

async function switchCamera() {
  facing.value = facing.value === 'environment' ? 'user' : 'environment'
  await startCamera()
}

async function toggleTorch() {
  const track = stream?.getVideoTracks()[0]
  if (!track) return
  torchOn.value = !torchOn.value
  try {
    await track.applyConstraints({ advanced: [{ torch: torchOn.value } as MediaTrackConstraintSet] })
  }
  catch {
    torchOn.value = false
    toast.add({ title: 'Torch not supported here', color: 'warning' })
  }
}

watch(stage, async (value) => {
  if (value === 'capture') await startCamera()
  else stopCamera()
})

watch(cameraReady, ready => {
  if (ready) inspectLiveFrame()
})

// The stage watcher alone never fires for the initial mount, so start here too.
onMounted(() => {
  if (stage.value === 'capture') startCamera()
})

/* ------------------------------- pages ------------------------------- */

let pageSeed = 0

function newId() {
  pageSeed += 1
  return `page-${Date.now()}-${pageSeed}`
}

function makeThumb(canvas: HTMLCanvasElement, width = 260) {
  const scale = Math.min(1, width / canvas.width)
  const thumb = document.createElement('canvas')
  thumb.width = Math.max(1, Math.round(canvas.width * scale))
  thumb.height = Math.max(1, Math.round(canvas.height * scale))
  const context = thumb.getContext('2d')!
  context.drawImage(canvas, 0, 0, thumb.width, thumb.height)
  return thumb.toDataURL('image/jpeg', 0.7)
}

function addPage(canvas: HTMLCanvasElement, { autoCropped = false } = {}) {
  let framed = canvas
  if (autoFrame.value && !autoCropped) {
    // Prefer a four-corner perspective correction. A rectangular crop is only
    // used as a conservative fallback when the scene is too dark/flat to find
    // a reliable sheet boundary.
    const quad = detectPageQuad(canvas)
    if (quad) {
      framed = warpPage(canvas, quad)
    }
  }
  const page: ScanPageItem = {
    id: newId(),
    original: framed,
    geom: framed,
    filters: { ...DEFAULT_FILTERS },
    thumb: makeThumb(framed),
  }
  pages.value.push(page)
  return page
}

function refreshThumb(page: ScanPageItem) {
  page.thumb = makeThumb(filterCanvas(page.geom, page.filters))
}

function imageSharpness(canvas: HTMLCanvasElement) {
  const sample = document.createElement('canvas')
  sample.width = 96
  sample.height = Math.max(32, Math.round((canvas.height / canvas.width) * sample.width))
  const context = sample.getContext('2d')!
  context.drawImage(canvas, 0, 0, sample.width, sample.height)
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data
  let total = 0
  let count = 0
  for (let y = 1; y < sample.height - 1; y++) for (let x = 1; x < sample.width - 1; x++) {
    const at = (y * sample.width + x) * 4
    const left = pixels[at - 4]
    const right = pixels[at + 4]
    const up = pixels[at - sample.width * 4]
    const down = pixels[at + sample.width * 4]
    total += Math.abs(left - right) + Math.abs(up - down)
    count++
  }
  return count ? total / count : 0
}

function quadSignature(quad: ReturnType<typeof detectPageQuad>) {
  if (!quad) return ''
  return Object.values(quad).map(point => `${Math.round(point.x * 20)}:${Math.round(point.y * 20)}`).join('|')
}

async function inspectLiveFrame() {
  if (!cameraReady.value || !videoEl.value || stage.value !== 'capture') return
  const preview = canvasFromVideo(videoEl.value, 960)
  const quad = autoFrame.value ? detectPageQuad(preview) : null
  documentDetected.value = Boolean(quad)
  if (!quad) {
    stableFrames.value = 0
    lastQuadSignature = ''
    detectionStatus.value = 'Move the document into the frame'
  }
  else {
    const signature = quadSignature(quad)
    const stable = signature === lastQuadSignature
    stableFrames.value = stable ? stableFrames.value + 1 : 1
    lastQuadSignature = signature
    const sharpness = imageSharpness(preview)
    if (sharpness < 7) {
      detectionStatus.value = 'Hold steady — focusing…'
    }
    else if (stableFrames.value < 3) {
      detectionStatus.value = 'Document found — hold steady'
    }
    else {
      detectionStatus.value = 'Ready to scan'
      if (autoCapture.value && stableFrames.value >= 5 && Date.now() - lastAutoCaptureAt > 1800) {
        lastAutoCaptureAt = Date.now()
        await capture()
      }
    }
  }
  if (cameraReady.value && stage.value === 'capture') {
    detectionTimer = window.setTimeout(inspectLiveFrame, 220)
  }
}

async function capture() {
  const video = videoEl.value
  if (!video || !cameraReady.value || captureBusy) return
  captureBusy = true
  try {
    // Re-sample at full resolution only after the live frame is stable, then
    // run boundary detection again so the saved image matches the preview.
    const canvas = canvasFromVideo(video)
    addPage(canvas)
    flash.value = true
    setTimeout(() => (flash.value = false), 160)
    stableFrames.value = 0
    detectionStatus.value = 'Captured — add another page or review'
    if (navigator.vibrate) navigator.vibrate([12, 35, 12])
  }
  finally {
    captureBusy = false
  }
}

function pickFromGallery() {
  galleryInput.value?.click()
}

async function onGalleryChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return
  try {
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.add({ title: `${file.name} is not an image`, color: 'warning' })
        continue
      }
      addPage(await canvasFromFile(file))
    }
    if (files.length) stage.value = 'review'
  }
  catch (error) {
    toast.add({
      title: 'Could not add that image',
      description: error instanceof Error ? error.message : undefined,
      color: 'error',
    })
  }
}

function removePage(page: ScanPageItem) {
  pages.value = pages.value.filter(candidate => candidate.id !== page.id)
  if (!pages.value.length) stage.value = 'capture'
}

function rotatePage(page: ScanPageItem, degrees: number) {
  page.geom = rotateCanvas(page.geom, degrees)
  refreshThumb(page)
  if (editing.value?.id === page.id) renderPreview()
}

function movePage(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= pages.value.length) return
  const list = [...pages.value]
  const [item] = list.splice(index, 1)
  list.splice(target, 0, item)
  pages.value = list
}

/* -------------------------------- editor -------------------------------- */

const editingId = ref<string | null>(null)
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const previewBox = ref<HTMLElement | null>(null)
const cropMode = ref(false)
const cropRect = ref<Rect>({ ...FULL_RECT })

let editBackup: { geom: HTMLCanvasElement, filters: ScanFilters } | null = null

const editing = computed(() => pages.value.find(page => page.id === editingId.value) ?? null)

const FILTERS: { id: FilterMode, label: string, icon: string }[] = [
  { id: 'original', label: 'Original', icon: 'i-lucide-image' },
  { id: 'enhance', label: 'Enhance', icon: 'i-lucide-sparkles' },
  { id: 'grayscale', label: 'Gray', icon: 'i-lucide-circle-half' },
  { id: 'bw', label: 'B&W', icon: 'i-lucide-contrast' },
]

function openEditor(page: ScanPageItem) {
  editingId.value = page.id
  editBackup = { geom: page.geom, filters: { ...page.filters } }
  cropMode.value = false
  cropRect.value = { ...FULL_RECT }
  stage.value = 'edit'
  nextTick(() => renderPreview())
}

function closeEditor(save: boolean) {
  const page = editing.value
  if (page) {
    if (save) {
      refreshThumb(page)
    }
    else if (editBackup) {
      page.geom = editBackup.geom
      page.filters = { ...editBackup.filters }
      refreshThumb(page)
    }
  }
  editBackup = null
  editingId.value = null
  stage.value = 'review'
}

/** Draws the edited page into the preview canvas, fitting the container. */
function renderPreview() {
  const page = editing.value
  const canvas = previewCanvas.value
  if (!page || !canvas) return
  const filtered = filterCanvas(page.geom, page.filters)
  const maxWidth = previewBox.value?.clientWidth || 720
  const maxHeight = Math.round(window.innerHeight * 0.52)
  const scale = Math.min(maxWidth / filtered.width, maxHeight / filtered.height, 1)
  canvas.width = Math.max(1, Math.round(filtered.width * scale))
  canvas.height = Math.max(1, Math.round(filtered.height * scale))
  const context = canvas.getContext('2d')!
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(filtered, 0, 0, canvas.width, canvas.height)
}

watch(() => editing.value?.filters, () => {
  if (stage.value === 'edit') renderPreview()
}, { deep: true })

function setFilter(mode: FilterMode) {
  const page = editing.value
  if (!page) return
  page.filters.mode = mode
}

function resetEdits() {
  const page = editing.value
  if (!page || !editBackup) return
  page.geom = cropCanvas(editBackup.geom, FULL_RECT)
  page.filters = { ...IDENTITY_FILTERS }
  cropRect.value = { ...FULL_RECT }
  cropMode.value = false
  renderPreview()
}

function applyCrop() {
  const page = editing.value
  if (!page) return
  const rect = cropRect.value
  if (rect.w < 0.99 || rect.h < 0.99 || rect.x > 0.005 || rect.y > 0.005) {
    page.geom = cropCanvas(page.geom, rect)
  }
  cropRect.value = { ...FULL_RECT }
  cropMode.value = false
  renderPreview()
}

/* Crop overlay dragging ------------------------------------------------ */

let cropDrag: { handle: string, startX: number, startY: number, rect: Rect } | null = null

const MIN_SIZE = 0.12

function startCropDrag(event: PointerEvent, handle: string) {
  event.stopPropagation()
  event.preventDefault()
  cropDrag = {
    handle,
    startX: event.clientX,
    startY: event.clientY,
    rect: { ...cropRect.value },
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function onCropDragMove(event: PointerEvent) {
  if (!cropDrag || !previewCanvas.value) return
  event.preventDefault()
  const box = previewCanvas.value.getBoundingClientRect()
  const dx = (event.clientX - cropDrag.startX) / box.width
  const dy = (event.clientY - cropDrag.startY) / box.height
  const start = cropDrag.rect
  let { x, y, w, h } = start

  if (cropDrag.handle === 'move') {
    x = Math.min(Math.max(0, start.x + dx), 1 - start.w)
    y = Math.min(Math.max(0, start.y + dy), 1 - start.h)
  }
  else {
    if (cropDrag.handle.includes('w')) {
      const right = start.x + start.w
      x = Math.min(Math.max(0, start.x + dx), right - MIN_SIZE)
      w = right - x
    }
    if (cropDrag.handle.includes('e')) {
      w = Math.min(Math.max(MIN_SIZE, start.w + dx), 1 - start.x)
    }
    if (cropDrag.handle.includes('n')) {
      const bottom = start.y + start.h
      y = Math.min(Math.max(0, start.y + dy), bottom - MIN_SIZE)
      h = bottom - y
    }
    if (cropDrag.handle.includes('s')) {
      h = Math.min(Math.max(MIN_SIZE, start.h + dy), 1 - start.y)
    }
  }
  cropRect.value = { x, y, w, h }
}

function endCropDrag(event: PointerEvent) {
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
  cropDrag = null
}

const cropStyle = computed(() => ({
  left: `${cropRect.value.x * 100}%`,
  top: `${cropRect.value.y * 100}%`,
  width: `${cropRect.value.w * 100}%`,
  height: `${cropRect.value.h * 100}%`,
}))

/* -------------------------------- saving -------------------------------- */

const documentName = ref('')
const isSaving = ref(false)
const saveProgress = ref(0)

const defaultName = computed(() => {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `Scan ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}`
})

async function createDocument() {
  if (!orgId.value || !pages.value.length || isSaving.value) return
  isSaving.value = true
  saveProgress.value = 0
  try {
    const canvases = pages.value.map(page => filterCanvas(page.geom, page.filters))
    const bytes = await buildScanPdf(canvases)
    const file = new File([bytes as BlobPart], scanFileName(documentName.value || defaultName.value), {
      type: 'application/pdf',
    })
    const uploaded = await uploadDocument(orgId.value, file, (percent) => {
      saveProgress.value = percent
    })
    toast.add({
      title: 'Scan saved to Papra',
      description: `${pages.value.length} page${pages.value.length === 1 ? '' : 's'} · ${uploaded.name}`,
      color: 'success',
    })
    pages.value = []
    router.replace(`/documents/${uploaded.id}`)
  }
  catch (error) {
    toast.add({
      title: 'Could not save the scan',
      description: error instanceof Error ? error.message : undefined,
      color: 'error',
    })
  }
  finally {
    isSaving.value = false
  }
}

/* ------------------------------- lifecycle ------------------------------- */

onBeforeUnmount(stopCamera)

const pageCount = computed(() => pages.value.length)
</script>

<template>
  <div class="min-h-dvh pb-32">
    <!-- ═══════════════════════════ CAPTURE ═══════════════════════════ -->
    <template v-if="stage === 'capture'">
      <div class="fixed inset-0 z-40 flex flex-col bg-black">
        <!-- Top bar -->
        <div class="safe-top flex items-center justify-between px-4 pt-3 pb-2 text-white">
          <button
            class="grid size-10 place-items-center rounded-full bg-white/10 active:bg-white/20"
            aria-label="Close scanner"
            @click="pages.length ? stage = 'review' : router.back()"
          >
            <UIcon name="i-lucide-x" class="size-5" />
          </button>
          <div class="text-center">
            <p class="text-sm font-medium">Scan document</p>
            <p class="text-[11px] text-white/60">
              {{ pageCount ? `${pageCount} page${pageCount === 1 ? '' : 's'} captured` : 'Point at the page' }}
            </p>
          </div>
          <button
            class="grid size-10 place-items-center rounded-full bg-white/10 active:bg-white/20 disabled:opacity-40"
            :aria-label="torchOn ? 'Turn off torch' : 'Turn on torch'"
            :disabled="!torchAvailable"
            @click="toggleTorch"
          >
            <UIcon :name="torchOn ? 'i-lucide-flashlight' : 'i-lucide-flashlight-off'" class="size-5" />
          </button>
        </div>

        <!-- Viewfinder -->
        <div class="relative flex-1 overflow-hidden">
          <video
            ref="videoEl"
            class="size-full object-contain"
            autoplay
            muted
            playsinline
          />

          <!-- Paper guides and live scanner feedback -->
          <div v-if="cameraReady" class="pointer-events-none absolute inset-6 rounded-2xl border-2 transition-colors" :class="documentDetected ? 'border-emerald-400/90' : 'border-white/40'">
            <span class="absolute -top-px -left-px size-7 rounded-tl-2xl border-t-4 border-l-4 border-white" />
            <span class="absolute -top-px -right-px size-7 rounded-tr-2xl border-t-4 border-r-4 border-white" />
            <span class="absolute -bottom-px -left-px size-7 rounded-bl-2xl border-b-4 border-l-4 border-white" />
            <span class="absolute -right-px -bottom-px size-7 rounded-br-2xl border-r-4 border-b-4 border-white" />
          </div>

          <div v-if="cameraReady" class="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-center text-[11px] font-medium text-white backdrop-blur">
            <span class="mr-1.5 inline-block size-1.5 rounded-full" :class="documentDetected ? 'bg-emerald-400' : 'bg-amber-300'" />
            {{ detectionStatus }}
          </div>

          <!-- Flash -->
          <div v-if="flash" class="absolute inset-0 bg-white/70" />

          <!-- Camera problems -->
          <div
            v-if="cameraError"
            class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-8 text-center text-white"
          >
            <UIcon name="i-lucide-camera-off" class="size-10 text-white/70" />
            <p class="text-sm text-white/80">{{ cameraError }}</p>
            <button
              class="rounded-full bg-white/15 px-4 py-2 text-xs font-medium active:bg-white/25"
              @click="startCamera"
            >
              Try again
            </button>
          </div>
        </div>

        <!-- Bottom controls -->
        <div class="safe-bottom flex items-center justify-between gap-3 px-6 pt-3 pb-5">
          <button
            class="flex h-14 w-20 flex-col items-center justify-center gap-0.5 rounded-2xl bg-white/10 text-white/80 active:bg-white/20"
            aria-label="Import from gallery"
            @click="pickFromGallery"
          >
            <UIcon name="i-lucide-images" class="size-5" />
            <span class="text-[10px]">Gallery</span>
          </button>

          <button
            class="grid size-[68px] place-items-center rounded-full border-4 border-white/80 disabled:opacity-40"
            aria-label="Capture page"
            :disabled="!cameraReady"
            @click="capture"
          >
            <span class="size-[52px] rounded-full bg-white" />
          </button>

          <button
            class="flex h-14 w-20 flex-col items-center justify-center gap-0.5 rounded-2xl text-white/80 active:bg-white/20"
            :class="pageCount ? 'bg-[var(--primary)] text-white' : 'bg-white/10'"
            :aria-label="pageCount ? 'Review pages' : 'Switch camera'"
            @click="pageCount ? stage = 'review' : switchCamera()"
          >
            <UIcon :name="pageCount ? 'i-lucide-check' : 'i-lucide-switch-camera'" class="size-5" />
            <span class="text-[10px]">{{ pageCount ? `Done (${pageCount})` : 'Flip' }}</span>
          </button>
        </div>

        <div class="absolute bottom-28 left-1/2 flex -translate-x-1/2 gap-2">
          <button
            class="rounded-full px-3 py-1.5 text-[11px] font-medium backdrop-blur"
            :class="autoFrame ? 'bg-[var(--primary)]/90 text-white' : 'bg-white/15 text-white/80'"
            @click="autoFrame = !autoFrame"
          >
            <UIcon name="i-lucide-crop" class="mr-1 inline size-3.5" />
            Auto-crop {{ autoFrame ? 'on' : 'off' }}
          </button>
          <button
            class="rounded-full px-3 py-1.5 text-[11px] font-medium backdrop-blur"
            :class="autoCapture ? 'bg-emerald-500/90 text-white' : 'bg-white/15 text-white/80'"
            @click="autoCapture = !autoCapture"
          >
            <UIcon name="i-lucide-scan-line" class="mr-1 inline size-3.5" />
            Auto-scan {{ autoCapture ? 'on' : 'off' }}
          </button>
        </div>

        <input ref="galleryInput" type="file" accept="image/*" multiple class="hidden" @change="onGalleryChosen">
      </div>
    </template>

    <!-- ═══════════════════════════ REVIEW ═══════════════════════════ -->
    <template v-else-if="stage === 'review'">
      <header class="safe-top sticky top-0 z-20 bg-[var(--background)]/95 backdrop-blur-xl">
        <div class="mx-auto flex max-w-lg items-center gap-2 px-3 pt-3 pb-2">
          <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" size="sm" aria-label="Back to camera" @click="stage = 'capture'" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-[var(--foreground)]">Review scan</p>
            <p class="text-[11px] text-[var(--muted-foreground)]">
              {{ pageCount }} page{{ pageCount === 1 ? '' : 's' }} · tap a page to edit
            </p>
          </div>
          <UButton
            label="Add page"
            icon="i-lucide-plus"
            size="xs"
            color="neutral"
            variant="soft"
            @click="stage = 'capture'"
          />
        </div>
      </header>

      <main class="mx-auto max-w-lg space-y-4 px-3">
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="(page, index) in pages"
            :key="page.id"
            class="surface overflow-hidden p-0"
          >
            <button class="relative block w-full" :aria-label="`Edit page ${index + 1}`" @click="openEditor(page)">
              <img :src="page.thumb" :alt="`Page ${index + 1}`" class="aspect-[3/4] w-full object-cover">
              <span class="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                {{ index + 1 }}
              </span>
            </button>
            <div class="flex items-center justify-between gap-0.5 border-t border-[var(--border)] px-1 py-1">
              <UButton icon="i-lucide-rotate-ccw" color="neutral" variant="ghost" size="xs" aria-label="Rotate left" @click="rotatePage(page, -90)" />
              <UButton icon="i-lucide-rotate-cw" color="neutral" variant="ghost" size="xs" aria-label="Rotate right" @click="rotatePage(page, 90)" />
              <UButton
                icon="i-lucide-arrow-left"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="Move page earlier"
                :disabled="index === 0"
                @click="movePage(index, -1)"
              />
              <UButton
                icon="i-lucide-arrow-right"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="Move page later"
                :disabled="index === pages.length - 1"
                @click="movePage(index, 1)"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                aria-label="Delete page"
                @click="removePage(page)"
              />
            </div>
          </div>
        </div>

        <div class="surface space-y-3 p-4">
          <label class="block text-xs font-medium text-[var(--muted-foreground)]" for="scan-name">Document name</label>
          <UInput
            id="scan-name"
            v-model="documentName"
            :placeholder="defaultName"
            class="w-full"
            icon="i-lucide-file-text"
          />
          <UProgress v-if="isSaving" :model-value="saveProgress" size="sm" />
          <UButton
            block
            size="lg"
            icon="i-lucide-cloud-upload"
            :loading="isSaving"
            :disabled="!pageCount"
            @click="createDocument"
          >
            {{ isSaving ? 'Uploading…' : `Create & upload (${pageCount})` }}
          </UButton>
          <p class="text-center text-[11px] text-[var(--muted-foreground)]">
            Pages are flattened into one searchable PDF and stored in
            {{ connectionStore.activeOrganization?.name ?? 'your organization' }}.
          </p>
        </div>
      </main>
    </template>

    <!-- ═══════════════════════════ EDIT ═══════════════════════════ -->
    <template v-else>
      <header class="safe-top sticky top-0 z-20 bg-[var(--background)]/95 backdrop-blur-xl">
        <div class="mx-auto flex max-w-lg items-center gap-2 px-3 pt-3 pb-2">
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" aria-label="Discard changes" @click="closeEditor(false)" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-[var(--foreground)]">Adjust page</p>
            <p class="text-[11px] text-[var(--muted-foreground)]">
              {{ cropMode ? 'Drag the corners to crop' : 'Rotate, crop and clean up the scan' }}
            </p>
          </div>
          <UButton label="Done" size="xs" @click="closeEditor(true)" />
        </div>
      </header>

      <main class="mx-auto max-w-lg space-y-4 px-3">
        <div ref="previewBox" class="flex justify-center">
          <div class="relative inline-block overflow-hidden rounded-xl bg-black/5">
            <canvas ref="previewCanvas" class="block max-h-[52vh] max-w-full" />
            <div
              v-if="cropMode"
              class="absolute inset-0 touch-none"
              @pointermove="onCropDragMove"
              @pointerup="endCropDrag"
              @pointercancel="endCropDrag"
            >
              <div class="absolute inset-0 bg-black/55" />
              <div class="absolute bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0)]" :style="cropStyle" @pointerdown="startCropDrag($event, 'move')">
                <div class="size-full border-2 border-white/90">
                  <span class="absolute inset-0 bg-white/0" />
                </div>
                <span class="absolute -top-3 -left-3 size-7 rounded-full border-2 border-white bg-[var(--primary)]" @pointerdown="startCropDrag($event, 'nw')" />
                <span class="absolute -top-3 -right-3 size-7 rounded-full border-2 border-white bg-[var(--primary)]" @pointerdown="startCropDrag($event, 'ne')" />
                <span class="absolute -bottom-3 -left-3 size-7 rounded-full border-2 border-white bg-[var(--primary)]" @pointerdown="startCropDrag($event, 'sw')" />
                <span class="absolute -right-3 -bottom-3 size-7 rounded-full border-2 border-white bg-[var(--primary)]" @pointerdown="startCropDrag($event, 'se')" />
              </div>
            </div>
          </div>
        </div>

        <div class="surface space-y-4 p-4">
          <!-- Rotate & crop -->
          <div class="flex items-center gap-2">
            <UButton icon="i-lucide-rotate-ccw" color="neutral" variant="soft" size="sm" aria-label="Rotate left" @click="editing && rotatePage(editing, -90)" />
            <UButton icon="i-lucide-rotate-cw" color="neutral" variant="soft" size="sm" aria-label="Rotate right" @click="editing && rotatePage(editing, 90)" />
            <UButton
              :label="cropMode ? 'Apply crop' : 'Crop'"
              :icon="cropMode ? 'i-lucide-check' : 'i-lucide-crop'"
              :color="cropMode ? 'primary' : 'neutral'"
              :variant="cropMode ? 'solid' : 'soft'"
              size="sm"
              @click="cropMode ? applyCrop() : (cropMode = true, cropRect = { ...FULL_RECT })"
            />
            <UButton label="Reset" icon="i-lucide-undo-2" color="neutral" variant="ghost" size="sm" class="ml-auto" @click="resetEdits" />
          </div>

          <!-- Filters -->
          <div class="flex gap-2 overflow-x-auto">
            <button
              v-for="option in FILTERS"
              :key="option.id"
              class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
              :class="editing?.filters.mode === option.id
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--muted)] text-[var(--foreground)]'"
              @click="setFilter(option.id)"
            >
              <UIcon :name="option.icon" class="size-3.5" />
              {{ option.label }}
            </button>
          </div>

          <!-- Tuning -->
          <div v-if="editing" class="space-y-3 pt-1">
            <div>
              <div class="mb-1 flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                <span class="font-medium">Brightness</span><span>{{ editing.filters.brightness }}</span>
              </div>
              <input
                v-model.number="editing.filters.brightness"
                type="range"
                min="-60"
                max="60"
                step="1"
                class="w-full accent-[var(--primary)]"
                aria-label="Brightness"
              >
            </div>
            <div>
              <div class="mb-1 flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                <span class="font-medium">Contrast</span><span>{{ editing.filters.contrast }}</span>
              </div>
              <input
                v-model.number="editing.filters.contrast"
                type="range"
                min="-60"
                max="80"
                step="1"
                class="w-full accent-[var(--primary)]"
                aria-label="Contrast"
              >
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <UButton label="Delete page" icon="i-lucide-trash-2" color="error" variant="soft" block @click="editing && removePage(editing)" />
          <UButton label="Re-capture" icon="i-lucide-camera" color="neutral" variant="soft" block @click="stage = 'capture'; closeEditor(true)" />
        </div>
      </main>
    </template>
  </div>
</template>
