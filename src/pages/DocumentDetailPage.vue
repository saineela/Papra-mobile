<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import {
  addTagToDocument,
  fetchDocumentFile,
  getDocumentActivity,
  getDocumentFileUrl,
  removeTagFromDocument,
  updateDocument,
} from '@/api/client'
import { openPdf, renderPdfPageToCanvas } from '@/utils/pdf'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { useConnectionStore, useDocumentsStore } from '@/stores/app'
import { formatDate, formatDateTime, formatBytes } from '@/utils/format'
import type { PapraDocument, PapraDocumentActivity } from '@/types/papra'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const connectionStore = useConnectionStore()
const documentsStore = useDocumentsStore()

const document = ref<PapraDocument | null>(null)
const activity = ref<PapraDocumentActivity[]>([])
const isLoading = ref(true)
const fileUrl = ref<string | null>(null)

/* Preview state — rendered locally with pdf.js / data-URLs because the Papra
 * server sends files as `application/octet-stream` with `X-Frame-Options:
 * SAMEORIGIN`, so iframes/embeds can never work in the WebView. */
const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
const imageUrl = ref<string | null>(null)
const isPreviewLoading = ref(false)
const isPreviewLoaded = ref(false)
const previewError = ref<string | null>(null)

const orgId = computed(() => connectionStore.activeOrganizationId!)
const documentId = computed(() => String(route.params.id))

const isImage = computed(() => (document.value?.mimeType ?? document.value?.contentType ?? '').startsWith('image/'))
const isPdf = computed(() => (document.value?.mimeType ?? document.value?.contentType ?? '').includes('pdf'))
const isText = computed(() => {
  const mime = document.value?.mimeType ?? document.value?.contentType ?? ''
  return mime.startsWith('text/') || mime.includes('json')
})

const dropdownItems = computed(() => [
  {
    label: 'Markup & Sign',
    icon: 'i-lucide-pen-line',
    onSelect: () => {
      router.push(`/documents/${documentId.value}/markup`)
    },
  },
  {
    label: 'Rename',
    icon: 'i-lucide-pencil',
    onSelect: () => {
      draftName.value = document.value?.name ?? ''
      isRenameOpen.value = true
    },
  },
  {
    label: 'Notes',
    icon: 'i-lucide-notebook-pen',
    onSelect: () => {
      draftNotes.value = document.value?.notes ?? ''
      isNotesOpen.value = true
    },
  },
  {
    label: 'Download',
    icon: 'i-lucide-download',
    onSelect: () => download(),
  },
  {
    label: 'Share',
    icon: 'i-lucide-share-2',
    onSelect: () => share(),
  },
  {
    label: 'Move to trash',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => {
      isTrashConfirmOpen.value = true
    },
  },
])

/* ------------------------------ state ------------------------------ */

const isRenameOpen = ref(false)
const draftName = ref('')
const isNotesOpen = ref(false)
const draftNotes = ref('')
const isTagsOpen = ref(false)
const isTrashConfirmOpen = ref(false)
const isSavingMeta = ref(false)

/* ------------------------------ helpers ------------------------------ */

const ACTIVITY_LABELS: Record<string, string> = {
  created: 'Document added',
  updated: 'Document updated',
  deleted: 'Moved to trash',
  restored: 'Restored from trash',
  tagged: 'Tag added',
  untagged: 'Tag removed',
}

function describeActivity(event: PapraDocumentActivity): string {
  const label = ACTIVITY_LABELS[event.event ?? ''] ?? (event.event ? event.event.replace(/_/g, ' ') : 'Activity')
  const tagName = (event.eventData as { tagName?: string } | null)?.tagName ?? event.tag?.name
  return tagName ? `${label} · ${tagName}` : label
}

/* ------------------------------ loading ------------------------------ */

onMounted(async () => {
  try {
    const [doc, acts] = await Promise.all([
      import('@/api/client').then(({ getDocument }) => getDocument(orgId.value, documentId.value)),
      getDocumentActivity(orgId.value, documentId.value).catch(() => []),
    ])
    document.value = doc
    activity.value = acts
    if (canPreview.value) loadPreview()
  } catch (error) {
    toast.add({ title: 'Could not load document', color: 'error' })
    router.back()
  } finally {
    isLoading.value = false
  }
})

const canPreview = computed(() => isPdf.value || isImage.value)

async function loadPreview() {
  if (!document.value || !canPreview.value || isPreviewLoading.value) return
  isPreviewLoading.value = true
  previewError.value = null
  try {
    const bytes = await fetchDocumentFile(orgId.value, documentId.value)
    if (isPdf.value) {
      const opened = await openPdf(bytes)
      try {
        const page = await opened.pdf.getPage(1)
        const cssWidth = Math.min(600, previewCanvasRef.value?.parentElement?.clientWidth ?? 400)
        const rendered = await renderPdfPageToCanvas(page, cssWidth)
        const host = previewCanvasRef.value
        if (host) {
          host.width = rendered.width
          host.height = rendered.height
          host.getContext('2d')!.drawImage(rendered, 0, 0)
        }
      }
      finally {
        await opened.destroy()
      }
      isPreviewLoaded.value = true
    } else if (isImage.value) {
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      imageUrl.value = `data:${isImage.value ? (document.value.mimeType ?? document.value.contentType) : 'application/octet-stream'};base64,${btoa(binary)}`
      isPreviewLoaded.value = true
    }
  } catch (error) {
    previewError.value = error instanceof Error ? error.message : 'Preview unavailable'
  } finally {
    isPreviewLoading.value = false
  }
}

async function retryPreview() {
  isPreviewLoaded.value = false
  await loadPreview()
}

/* ------------------------------ actions ------------------------------ */

async function saveRename() {
  if (!document.value || !draftName.value.trim()) return
  isSavingMeta.value = true
  try {
    const { getDocument: refetch } = await import('@/api/client')
    const updated = await updateDocument(orgId.value, documentId.value, { name: draftName.value.trim() })
    documentsStore.replaceDocument({ ...document.value, ...updated })
    document.value = { ...document.value, name: updated.name }
    isRenameOpen.value = false
    toast.add({ title: 'Renamed', color: 'success' })
  } catch {
    toast.add({ title: 'Rename failed', color: 'error' })
  } finally {
    isSavingMeta.value = false
  }
}

async function saveNotes() {
  if (!document.value) return
  isSavingMeta.value = true
  try {
    await updateDocument(orgId.value, documentId.value, { notes: draftNotes.value })
    document.value = { ...document.value, notes: draftNotes.value }
    isNotesOpen.value = false
    toast.add({ title: 'Notes saved', color: 'success' })
  } catch {
    toast.add({ title: 'Could not save notes', color: 'error' })
  } finally {
    isSavingMeta.value = false
  }
}

async function toggleTag(tagId: string) {
  if (!document.value) return
  const has = document.value.tags?.some((tag) => tag.id === tagId)
  try {
    if (has) {
      await removeTagFromDocument(orgId.value, documentId.value, tagId)
      document.value = {
        ...document.value,
        tags: (document.value.tags ?? []).filter((tag) => tag.id !== tagId),
      }
    } else {
      await addTagToDocument(orgId.value, documentId.value, tagId)
      const tag = documentsStore.tags.find((candidate) => candidate.id === tagId)
      if (tag) {
        document.value = {
          ...document.value,
          tags: [...(document.value.tags ?? []), { ...tag }],
        }
      }
    }
  } catch {
    toast.add({ title: 'Tag update failed', color: 'error' })
  }
}

async function moveToTrash() {
  try {
    await import('@/api/client').then(({ trashDocument }) => trashDocument(orgId.value, documentId.value))
    toast.add({ title: 'Moved to trash', color: 'success' })
    router.back()
  } catch {
    toast.add({ title: 'Could not move to trash', color: 'error' })
  }
}

/** Downloads the file and writes it into device-visible storage; returns a shareable file URI. */
async function writeLocalCopy(): Promise<string> {
  if (!document.value) throw new Error('No document')
  const bytes = await fetchDocumentFile(orgId.value, documentId.value)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  const fileName = document.value.name || 'document'
  await Filesystem.writeFile({
    path: fileName,
    data: btoa(binary),
    directory: Directory.Documents,
    recursive: true,
  })
  const { uri } = await Filesystem.getUri({ directory: Directory.Documents, path: fileName })
  return uri
}

async function download() {
  if (!document.value) return
  try {
    const uri = await writeLocalCopy()
    toast.add({ title: `Saved to ${Capacitor.isNativePlatform() ? 'device Documents' : uri}`, color: 'success' })
  } catch {
    toast.add({ title: 'Download failed', color: 'error' })
  }
}

async function share() {
  if (!document.value) return
  try {
    const { share: natShare } = await import('@capacitor/share')
    if (Capacitor.isNativePlatform()) {
      const uri = await writeLocalCopy()
      await natShare({ title: document.value.name, url: uri, dialogTitle: 'Share document' })
    } else {
      const url = await getDocumentFileUrl(orgId.value, documentId.value)
      await natShare({ title: document.value.name, url, dialogTitle: 'Share document' })
    }
  } catch {
    toast.add({ title: 'Sharing not available here', color: 'warning' })
  }
}
</script>

<template>
  <div class="min-h-dvh pb-28">
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
        <span class="min-w-0 flex-1 truncate px-1 text-sm font-medium text-[var(--muted-foreground)]">
          {{ document?.name ?? 'Document' }}
        </span>
        <UDropdownMenu :items="dropdownItems">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="More actions"
          />
        </UDropdownMenu>
      </div>
    </header>

    <main v-if="isLoading" class="mx-auto max-w-lg space-y-3 px-4 pt-4">
      <USkeleton class="h-64 w-full rounded-2xl" />
      <USkeleton class="h-16 w-full rounded-2xl" />
      <USkeleton class="h-16 w-full rounded-2xl" />
    </main>

    <main v-else-if="document" class="mx-auto max-w-lg space-y-4 px-4">
      <!-- Preview -->
      <section class="surface overflow-hidden">
        <!-- Image preview: data URL (blob: URLs can't render in the Android WebView) -->
        <div v-if="imageUrl" class="bg-[var(--background)]">
          <img :src="imageUrl" :alt="document.name" class="max-h-96 w-full object-contain" />
        </div>

        <!-- PDF preview: first page rendered locally with pdf.js -->
        <div v-else-if="isPdf" class="bg-[var(--background)] px-2 py-2">
          <canvas ref="previewCanvasRef" class="w-full rounded-lg" />
          <div v-if="isPreviewLoading" class="flex h-48 flex-col items-center justify-center gap-2">
            <span class="i-lucide-loader-circle size-6 animate-spin text-[var(--muted-foreground)]" />
            <p class="text-xs text-[var(--muted-foreground)]">Rendering preview…</p>
          </div>
          <p
            v-else-if="previewError"
            class="py-6 text-center text-xs text-[var(--muted-foreground)]"
          >
            {{ previewError }}
          </p>
        </div>

        <!-- Generic file (no preview) -->
        <div
          v-else
          class="flex h-48 flex-col items-center justify-center gap-2 bg-[var(--background)]"
        >
          <UIcon :name="isText ? 'i-lucide-file-code' : 'i-lucide-file'" class="size-10 text-[var(--muted-foreground)]" />
          <p class="text-xs text-[var(--muted-foreground)]">
            {{ isText ? 'Preview not supported — download to view' : 'No preview available' }}
          </p>
        </div>

        <button
          v-if="!isPreviewLoaded && canPreview && !isPreviewLoading"
          class="w-full border-t border-[var(--border-accented)] py-3 text-sm font-medium text-[var(--primary)] active:bg-[var(--muted)]"
          @click="retryPreview"
        >
          Load preview
        </button>
      </section>

      <!-- Title + meta -->
      <section class="surface p-4">
        <h1 class="text-lg font-semibold leading-snug text-[var(--foreground)]">
          {{ document.name }}
        </h1>
        <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--muted-foreground)]">
          <span class="flex items-center gap-1.5">
            <UIcon name="i-lucide-calendar" class="size-3.5" />
            Added {{ formatDate(document.createdAt) }}
          </span>
          <span class="flex items-center gap-1.5">
            <UIcon name="i-lucide-hard-drive" class="size-3.5" />
            {{ formatBytes(document.originalSize) }}
          </span>
        </div>
        <p v-if="document.notes" class="mt-3 rounded-xl bg-[var(--background)] p-3 text-sm leading-relaxed text-[var(--foreground)]">
          {{ document.notes }}
        </p>
      </section>

      <!-- Tags -->
      <section class="surface p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-[var(--foreground)]">Tags</h2>
          <UButton
            icon="i-lucide-plus"
            size="xs"
            variant="soft"
            aria-label="Edit tags"
            @click="isTagsOpen = true"
          />
        </div>
        <div v-if="document.tags?.length" class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="tag in document.tags"
            :key="tag.id"
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            :style="{ backgroundColor: `${tag.color}22`, color: tag.color }"
          >
            <span class="size-1.5 rounded-full" :style="{ backgroundColor: tag.color }" />
            {{ tag.name }}
          </span>
        </div>
        <p v-else class="mt-2 text-xs text-[var(--muted-foreground)]">
          No tags yet. Tap + to organize this document.
        </p>
      </section>

      <!-- Activity -->
      <section v-if="activity.length" class="surface p-4">
        <h2 class="text-sm font-semibold text-[var(--foreground)]">Activity</h2>
        <ul class="mt-3 space-y-3">
          <li v-for="event in activity.slice(0, 10)" :key="event.id" class="flex gap-3">
            <span class="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
            <div class="min-w-0">
              <p class="text-xs text-[var(--foreground)]">
                {{ describeActivity(event) }}
                <template v-if="event.user?.name"> · {{ event.user.name }}</template>
              </p>
              <p class="text-[10px] text-[var(--muted-foreground)]">{{ formatDateTime(event.createdAt) }}</p>
            </div>
          </li>
        </ul>
      </section>
    </main>

    <!-- Rename modal -->
    <UModal v-model:open="isRenameOpen" title="Rename document">
      <template #body>
        <UInput v-model="draftName" autofocus class="w-full" size="lg" placeholder="Document name" @keydown.enter="saveRename" />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="isRenameOpen = false" />
          <UButton label="Save" :loading="isSavingMeta" @click="saveRename" />
        </div>
      </template>
    </UModal>

    <!-- Notes modal -->
    <UModal v-model:open="isNotesOpen" title="Notes">
      <template #body>
        <UTextarea v-model="draftNotes" :rows="5" class="w-full" placeholder="Add a note to this document…" />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="isNotesOpen = false" />
          <UButton label="Save" :loading="isSavingMeta" @click="saveNotes" />
        </div>
      </template>
    </UModal>

    <!-- Tags drawer -->
    <UDrawer v-model:open="isTagsOpen" title="Edit tags">
      <div class="max-h-[60dvh] space-y-1.5 overflow-y-auto p-4">
        <p v-if="!documentsStore.tags.length" class="text-sm text-[var(--muted-foreground)]">
          No tags in this organization yet. Create tags from the Tags tab.
        </p>
        <button
          v-for="tag in documentsStore.tags"
          :key="tag.id"
          class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-colors active:bg-[var(--muted)]"
          @click="toggleTag(tag.id)"
        >
          <span
            class="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium"
            :style="{ backgroundColor: `${tag.color}22`, color: tag.color }"
          >
            <span class="size-1.5 rounded-full" :style="{ backgroundColor: tag.color }" />
            {{ tag.name }}
          </span>
          <UIcon
            :name="document?.tags?.some((t) => t.id === tag.id) ? 'i-lucide-circle-check' : 'i-lucide-circle'"
            class="size-5"
            :class="document?.tags?.some((t) => t.id === tag.id) ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'"
          />
        </button>
      </div>
    </UDrawer>

    <!-- Trash confirmation -->
    <UModal v-model:open="isTrashConfirmOpen" title="Move to trash?">
      <template #body>
        <p class="text-sm text-[var(--muted-foreground)]">
          You can restore it from the Trash later, or delete it forever there.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="isTrashConfirmOpen = false" />
          <UButton label="Move to trash" color="error" :loading="false" @click="moveToTrash" />
        </div>
      </template>
    </UModal>
  </div>
</template>
