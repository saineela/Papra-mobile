<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import { uploadDocument } from '@/api/client'
import { useConnectionStore } from '@/stores/app'
import { formatBytes } from '@/utils/format'

const router = useRouter()
const toast = useToast()
const connectionStore = useConnectionStore()

const fileInput = ref<HTMLInputElement | null>(null)
const pendingFiles = ref<File[]>([])
const uploadingIndex = ref(-1)
const uploadProgress = ref(0)
const isUploading = ref(false)

const orgId = computed(() => connectionStore.activeOrganizationId)

function pickFiles() {
  fileInput.value?.click()
}

function onFilesChosen(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files) {
    pendingFiles.value = [...pendingFiles.value, ...Array.from(input.files)]
  }
  input.value = ''
}

function removePending(index: number) {
  pendingFiles.value = pendingFiles.value.filter((_, i) => i !== index)
}

async function startUpload() {
  if (!orgId.value || !pendingFiles.value.length) return
  isUploading.value = true

  const results = { ok: 0, failed: 0 }

  for (const [index, file] of pendingFiles.value.entries()) {
    uploadingIndex.value = index
    uploadProgress.value = 0
    try {
      await uploadDocument(orgId.value, file, (percent) => {
        uploadProgress.value = percent
      })
      results.ok += 1
    } catch (uploadError) {
      results.failed += 1
      console.error('Upload failed', uploadError)
    }
  }

  isUploading.value = false
  uploadingIndex.value = -1

  if (results.ok > 0) {
    toast.add({
      title: `Uploaded ${results.ok} document${results.ok === 1 ? '' : 's'}`,
      description: results.failed > 0 ? `${results.failed} failed` : undefined,
      color: results.failed > 0 ? 'warning' : 'success',
    })
    pendingFiles.value = []
    router.replace({ name: 'dashboard' })
  } else {
    toast.add({ title: 'Upload failed', description: 'Check your connection and try again.', color: 'error' })
  }
}
</script>

<template>
  <div class="min-h-dvh pb-28">
    <header class="safe-top">
      <div class="mx-auto max-w-lg px-4 pt-4 pb-3">
        <h1 class="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Add documents</h1>
        <p class="mt-0.5 text-sm text-[var(--muted-foreground)]">
          Upload files to {{ connectionStore.activeOrganization?.name ?? 'your organization' }}
        </p>
      </div>
    </header>

    <main class="mx-auto max-w-lg space-y-5 px-4">
      <input ref="fileInput" type="file" multiple class="hidden" @change="onFilesChosen" />

      <button
        class="relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl bg-[var(--primary)] py-10 text-white transition-transform active:scale-[0.99]"
        @click="router.push('/scan')"
      >
        <span class="flex size-14 items-center justify-center rounded-2xl bg-white/20">
          <UIcon name="i-lucide-scan-line" class="size-7" />
        </span>
        <span class="text-base font-semibold">Scan &amp; create document</span>
        <span class="px-8 text-center text-xs text-white/80">
          Use the camera, adjust and rotate each page, then upload automatically
        </span>
      </button>

      <button
        class="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[var(--border-accented)] bg-[var(--muted)]/50 py-10 transition-colors active:bg-[var(--muted)]"
        @click="pickFiles"
      >
        <span class="flex size-14 items-center justify-center rounded-2xl bg-[var(--primary-scale)]">
          <UIcon name="i-lucide-cloud-upload" class="size-7 text-[var(--primary)]" />
        </span>
        <span class="text-sm font-medium text-[var(--foreground)]">Upload existing files</span>
        <span class="text-xs text-[var(--muted-foreground)]">PDF, images, Office documents — any type</span>
      </button>

      <div v-if="pendingFiles.length" class="space-y-2.5">
        <h2 class="text-sm font-semibold text-[var(--foreground)]">
          Ready to upload ({{ pendingFiles.length }})
        </h2>
        <div
          v-for="(file, index) in pendingFiles"
          :key="`${file.name}-${index}`"
          class="surface flex items-center gap-3 p-3.5"
        >
          <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-scale)]">
            <UIcon name="i-lucide-file" class="size-5 text-[var(--primary)]" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-[var(--foreground)]">{{ file.name }}</p>
            <p class="text-xs text-[var(--muted-foreground)]">{{ formatBytes(file.size) }}</p>
            <UProgress
              v-if="isUploading && uploadingIndex === index"
              :model-value="uploadProgress"
              size="xs"
              class="mt-2"
            />
          </div>
          <UButton
            v-if="!isUploading"
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="`Remove ${file.name}`"
            @click="removePending(index)"
          />
          <UIcon v-else-if="uploadingIndex > index" name="i-lucide-circle-check" class="size-5 text-[var(--success)]" />
        </div>

        <UButton
          block
          size="lg"
          icon="i-lucide-upload"
          :loading="isUploading"
          :disabled="!pendingFiles.length"
          @click="startUpload"
        >
          Upload {{ pendingFiles.length }} file{{ pendingFiles.length === 1 ? '' : 's' }}
        </UButton>
      </div>

      <div class="surface p-4">
        <h3 class="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <UIcon name="i-lucide-lightbulb" class="size-4 text-[var(--warning)]" />
          Tip
        </h3>
        <p class="mt-1.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
          Photos of receipts and paper documents are OCRed by your Papra server automatically,
          making them searchable by their content.
        </p>
      </div>
    </main>
  </div>
</template>
