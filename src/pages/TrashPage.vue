<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import {
  deleteDocumentForever,
  emptyTrash,
  listDeletedDocuments,
  restoreDocument,
} from '@/api/client'
import { useConnectionStore } from '@/stores/app'
import { formatDate, formatBytes } from '@/utils/format'
import type { PapraDocument } from '@/types/papra'
import DocumentCard from '@/components/DocumentCard.vue'

const toast = useToast()
const connectionStore = useConnectionStore()

const documents = ref<PapraDocument[]>([])
const isLoading = ref(true)
const busyDocumentId = ref<string | null>(null)
const isEmptying = ref(false)
const emptyConfirmOpen = ref(false)
const deleteCandidate = ref<PapraDocument | null>(null)
const isDeleteOpen = computed({
  get: () => deleteCandidate.value !== null,
  set: (value: boolean) => {
    if (!value) deleteCandidate.value = null
  },
})

const orgId = computed(() => connectionStore.activeOrganizationId)

async function load() {
  if (!orgId.value) return
  isLoading.value = true
  try {
    const page = await listDeletedDocuments(orgId.value)
    documents.value = page.documents
  } catch {
    toast.add({ title: 'Could not load trash', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

async function restore(doc: PapraDocument) {
  busyDocumentId.value = doc.id
  try {
    await restoreDocument(orgId.value, doc.id)
    documents.value = documents.value.filter((candidate) => candidate.id !== doc.id)
    toast.add({ title: 'Restored', description: doc.name, color: 'success' })
  } catch {
    toast.add({ title: 'Restore failed', color: 'error' })
  } finally {
    busyDocumentId.value = null
  }
}

async function deleteForever(doc: PapraDocument) {
  busyDocumentId.value = doc.id
  try {
    await deleteDocumentForever(orgId.value, doc.id)
    documents.value = documents.value.filter((candidate) => candidate.id !== doc.id)
    toast.add({ title: 'Deleted forever', color: 'success' })
  } catch {
    toast.add({ title: 'Delete failed', color: 'error' })
  } finally {
    busyDocumentId.value = null
    deleteCandidate.value = null
  }
}

async function emptyAll() {
  isEmptying.value = true
  try {
    await emptyTrash(orgId.value)
    documents.value = []
    toast.add({ title: 'Trash emptied', color: 'success' })
  } catch {
    toast.add({ title: 'Could not empty trash', color: 'error' })
  } finally {
    isEmptying.value = false
    emptyConfirmOpen.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-dvh pb-28">
    <header class="safe-top">
      <div class="mx-auto flex max-w-lg items-center justify-between px-4 pt-5 pb-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Trash</h1>
          <p class="mt-0.5 text-sm text-[var(--muted-foreground)]">
            {{ documents.length }} deleted document{{ documents.length === 1 ? '' : 's' }}
          </p>
        </div>
        <UButton
          v-if="documents.length"
          label="Empty"
          color="error"
          variant="soft"
          size="sm"
          icon="i-lucide-trash-2"
          @click="emptyConfirmOpen = true"
        />
      </div>
    </header>

    <main class="mx-auto max-w-lg space-y-2.5 px-4">
      <div v-if="isLoading" class="space-y-2.5">
        <USkeleton v-for="i in 4" :key="i" class="h-[74px] w-full rounded-2xl" />
      </div>

      <template v-else-if="documents.length">
        <div
          v-for="doc in documents"
          :key="doc.id"
          class="surface flex items-center gap-3 p-3.5"
        >
          <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)]">
            <UIcon name="i-lucide-file-x-2" class="size-5 text-[var(--muted-foreground)]" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-[var(--foreground)]">{{ doc.name }}</p>
            <p class="text-xs text-[var(--muted-foreground)]">
              {{ formatBytes(doc.originalSize) }} · deleted {{ formatDate(doc.deletedAt) }}
            </p>
          </div>
          <UButton
            icon="i-lucide-undo-2"
            color="primary"
            variant="soft"
            size="xs"
            :loading="busyDocumentId === doc.id"
            aria-label="Restore document"
            @click="restore(doc)"
          />
          <UButton
            icon="i-lucide-x"
            color="error"
            variant="ghost"
            size="xs"
            aria-label="Delete forever"
            @click="deleteCandidate = doc"
          />
        </div>
      </template>

      <div v-else class="rounded-2xl border border-dashed border-[var(--border-accented)] py-16 text-center">
        <UIcon name="i-lucide-trash-2" class="mx-auto size-10 text-[var(--muted-foreground)]" />
        <p class="mt-3 text-sm font-medium text-[var(--foreground)]">Trash is empty</p>
        <p class="mt-1 text-xs text-[var(--muted-foreground)]">Deleted documents land here first</p>
      </div>
    </main>

    <UModal v-model:open="emptyConfirmOpen" title="Empty trash?">
      <template #body>
        <p class="text-sm text-[var(--muted-foreground)]">
          All {{ documents.length }} documents will be permanently deleted. This cannot be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="emptyConfirmOpen = false" />
          <UButton label="Delete everything" color="error" :loading="isEmptying" @click="emptyAll" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isDeleteOpen" title="Delete forever?">
      <template #body>
        <p class="text-sm text-[var(--muted-foreground)]">
          “{{ deleteCandidate?.name }}” will be permanently deleted. This cannot be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="deleteCandidate = null" />
          <UButton
            label="Delete forever"
            color="error"
            :loading="busyDocumentId === deleteCandidate?.id"
            @click="deleteCandidate && deleteForever(deleteCandidate)"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
