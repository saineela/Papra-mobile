let pdfjsPromise: Promise<any> | null = null

/**
 * Lazily loads the pdf.js API.
 *
 * Why `?worker` instead of `GlobalWorkerOptions.workerSrc = <asset url>`:
 * in the Capacitor WebView the bundled `pdf.worker.*.mjs` asset URL is not
 * usable as a script, so pdf.js silently fell back to its "fake worker" path.
 * That path dynamically imports the worker module, producing a SECOND copy of
 * the pdf.js classes in the same thread — and objects crossing the two copies
 * threw "Cannot read private member #s from an object whose class did not
 * declare it". Vite's `?worker` import emits a self-contained worker file we
 * can instantiate directly, so the fallback never runs.
 */
export async function loadPdfJs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').catch((error) => {
      pdfjsPromise = null
      throw error
    })
  }
  return pdfjsPromise
}

export interface OpenPdf {
  pdf: any
  /** Tears the document and its worker down. Safe to call more than once. */
  destroy: () => Promise<void>
}

/**
 * Parses raw bytes into a pdf.js document bound to a FRESH worker.
 *
 * One worker per document matters: when a single shared worker port is reused,
 * the first `pdf.destroy()` tears that worker down and every later document
 * hangs forever waiting for a reply — that was the blank Markup & Sign page
 * (the document preview mounts first and destroys the shared worker).
 *
 * The worker is passed in explicitly rather than through
 * `GlobalWorkerOptions.workerPort`, so concurrent loads can never clobber each
 * other's worker.
 *
 * @param bytes raw file bytes; copied because pdf.js detaches the buffer
 */
export async function openPdf(bytes: Uint8Array): Promise<OpenPdf> {
  const pdfjs = await loadPdfJs()
  const { default: PdfWorker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')

  // A real Worker thread. Vite emits a self-contained bundle for it, so the
  // thread has its own single copy of the pdf.js classes — no cross-copy bugs.
  const workerPort = new PdfWorker()
  const worker = new pdfjs.PDFWorker({ port: workerPort })

  let pdf: any
  try {
    pdf = await pdfjs.getDocument({ data: bytes.slice(), worker }).promise
  }
  catch (error) {
    try {
      workerPort.terminate()
    }
    catch {
      // ignore
    }
    throw error
  }

  let isDestroyed = false
  return {
    pdf,
    async destroy() {
      if (isDestroyed) return
      isDestroyed = true
      try {
        await pdf.destroy()
      }
      catch {
        // the document may already be torn down; the worker still must die
      }
      try {
        workerPort.terminate()
      }
      catch {
        // ignore
      }
    },
  }
}

/** Renders one pdf.js page into a canvas sized to the given CSS width. */
export async function renderPdfPageToCanvas(page: any, cssWidth: number): Promise<HTMLCanvasElement> {
  const baseViewport = page.getViewport({ scale: 1 })
  const scale = cssWidth / baseViewport.width
  const viewport = page.getViewport({ scale: scale * (window.devicePixelRatio || 1) })

  const canvas = window.document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  canvas.style.width = '100%'
  canvas.style.display = 'block'

  const context = canvas.getContext('2d')!
  await page.render({ canvas, canvasContext: context, viewport }).promise
  return canvas
}
