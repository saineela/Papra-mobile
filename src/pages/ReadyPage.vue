<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import { useConnectionStore, useDocumentsStore } from '@/stores/app'
import { formatBytes } from '@/utils/format'
import type { PapraTag } from '@/types/papra'

/**
 * "Ready" — organized request folders.
 *
 * A folder is a Papra tag named "ready/<folder>" (Papra has no native folder
 * entity, so tags give us names, colors, and per-document membership — and
 * everything stays stored in Papra itself). Creating a folder creates the
 * tag; adding documents to a folder attaches the tag to them.
 */

const router = useRouter()
const toast = useToast()
const connectionStore = useConnectionStore()
const documentsStore = useDocumentsStore()

const FOLDER_PREFIX = 'ready/'

interface Folder {
  tag: PapraTag
  name: string
  documentIds: Set<string>
}

const folders = ref<Folder[]>([])
const isLoading = ref(true)

const isCreateOpen = ref(false)
const newFolderName = ref('')
const isCreating = ref(false)

const activeFolder = ref<Folder | null>(null)

const availableDocuments = computed(() =>
  documentsStore.documents.filter(
    (doc) => !(activeFolder.value?.documentIds.has(doc.id)),
  ),
)

const isValidName = computed(() => {
  const name = newFolderName.value.trim()
  return name.length >= 1 && name.length <= 48
})

onMounted(async () => {
  await refresh()
})

async function refresh() {
  if (!connectionStore.activeOrganizationId) return
  isLoading.value = true
  try {
    // Ensure the document list is loaded so membership counts work
    if (!documentsStore.documents.length) {
      await documentsStore.fetchOrganizationData(connectionStore.activeOrganizationId)
    }
    else if (documentsStore.tags.length === 0) {
      await documentsStore.refresh(connectionStore.activeOrganizationId)
    }
    rebuildFolders()
  }
  finally {
    isLoading.value = false
  }
}

function rebuildFolders() {
  const docsByTag = new Map<string, Set<string>>()
  for (const doc of documentsStore.documents) {
    for (const tag of doc.tags ?? []) {
      if (!docsByTag.has(tag.id)) docsByTag.set(tag.id, new Set())
      docsByTag.get(tag.id)!.add(doc.id)
    }
  }

  folders.value = documentsStore.tags
    .filter((tag) => tag.name.startsWith(FOLDER_PREFIX))
    .map(tag => ({
      tag,
      name: tag.name.slice(FOLDER_PREFIX.length),
      documentIds: docsByTag.get(tag.id) ?? new Set(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function createFolder() {
  const name = newFolderName.value.trim()
  if (!name || !connectionStore.activeOrganizationId) return
  isCreating.value = true
  try {
    const { createTag } = await import('@/api/client')
    const tag = await createTag(connectionStore.activeOrganizationId, {
      name: `${FOLDER_PREFIX}${name}`,
      color: '#0ea5e9',
      description: 'Ready folder — organized request',
    })
    documentsStore.upsertTag(tag)
    newFolderName.value = ''
    isCreateOpen.value = false
    rebuildFolders()
    toast.add({ title: 'Folder created', description: `“${name}” is ready to fill`, color: 'success' })
  }
  catch {
    toast.add({ title: 'Could not create folder', color: 'error' })
  }
  finally {
    isCreating.value = false
  }
}

function openFolder(folder: Folder) {
  activeFolder.value = folder
}

function closeFolder() {
  activeFolder.value = null
}

async function addDocumentToFolder(docId: string) {
  const folder = activeFolder.value
  if (!folder || !connectionStore.activeOrganizationId) return
  try {
    const { addTagToDocument } = await import('@/api/client')
    await addTagToDocument(connectionStore.activeOrganizationId, docId, folder.tag.id)
    folder.documentIds.add(docId)
    const doc = documentsStore.documents.find(candidate => candidate.id === docId)
    if (doc) {
      doc.tags = [...(doc.tags ?? []), { ...folder.tag }]
    }
    // keep folder view reactive
    activeFolder.value = { ...folder, documentIds: new Set(folder.documentIds) }
    toast.add({ title: 'Added to folder', color: 'success' })
  }
  catch {
    toast.add({ title: 'Could not add document', color: 'error' })
  }
}

async function removeDocumentFromFolder(docId: string) {
  const folder = activeFolder.value
  if (!folder || !connectionStore.activeOrganizationId) return
  try {
    const { removeTagFromDocument } = await import('@/api/client')
    await removeTagFromDocument(connectionStore.activeOrganizationId, docId, folder.tag.id)
    folder.documentIds.delete(docId)
    const doc = documentsStore.documents.find(candidate => candidate.id === docId)
    if (doc) {
      doc.tags = (doc.tags ?? []).filter(tag => tag.id !== folder.tag.id)
    }
    activeFolder.value = { ...folder, documentIds: new Set(folder.documentIds) }
    toast.add({ title: 'Removed from folder', color: 'neutral' })
  }
  catch {
    toast.add({ title: 'Could not remove document', color: 'error' })
  }
}

async function deleteFolder() {
  const folder = activeFolder.value
  if (!folder || !connectionStore.activeOrganizationId) return
  try {
    const { deleteTag } = await import('@/api/client')
    await deleteTag(connectionStore.activeOrganizationId, folder.tag.id)
    documentsStore.removeTagFromAll(folder.tag.id)
    activeFolder.value = null
    rebuildFolders()
    toast.add({ title: 'Folder deleted', color: 'neutral' })
  }
  catch {
    toast.add({ title: 'Could not delete folder', color: 'error' })
  }
}

function goToDocument(docId: string) {
  router.push(`/documents/${docId}`)
}
</script>

<template>
  <div class="min-h-dvh pb-28">
    <header class="safe-top sticky top-0 z-30 bg-[var(--background)]/95 backdrop-blur-xl">
      <div class="mx-auto max-w-lg px-4 pt-4 pb-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h1 class="text-xl font-bold tracking-tight text-[var(--foreground)]">Ready</h1>
            <p class="text-xs text-[var(--muted-foreground)]">Organized request folders, stored in Papra</p>
          </div>
          <UButton
            v-if="!activeFolder"
            icon="i-lucide-folder-plus"
            size="sm"
            @click="isCreateOpen = true"
          >
            New folder
          </UButton>
          <UButton
            v-else
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Back to folders"
            @click="closeFolder"
          />
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-lg space-y-3 px-4">
      <!-- ================= Folder contents view ================= -->
      <template v-if="activeFolder">
        <section class="surface p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate text-lg font-semibold text-[var(--foreground)]">{{ activeFolder.name }}</h2>
              <p class="text-xs text-[var(--muted-foreground)]">
                {{ activeFolder.documentIds.size }} document{{ activeFolder.documentIds.size === 1 ? '' : 's' }} in this folder
              </p>
            </div>
            <span
              class="grid size-11 shrink-0 place-items-center rounded-2xl"
              :style="{ backgroundColor: `${activeFolder.tag.color}22`, color: activeFolder.tag.color }"
            >
              <UIcon name="i-lucide-folder" class="size-5" />
            </span>
          </div>
        </section>

        <!-- Documents in the folder -->
        <section class="space-y-2">
          <p v-if="activeFolder.documentIds.size === 0" class="px-1 text-sm text-[var(--muted-foreground)]">
            This folder is empty. Add documents below ↓
          </p>
          <div
            v-for="doc in documentsStore.documents.filter(d => activeFolder.documentIds.has(d.id))"
            :key="doc.id"
            class="surface flex items-center gap-3 p-3"
          >
            <button class="min-w-0 flex-1 text-left" @click="goToDocument(doc.id)">
              <p class="truncate text-sm font-medium text-[var(--foreground)]">{{ doc.name }}</p>
              <p class="text-xs text-[var(--muted-foreground)]">{{ formatBytes(doc.originalSize) }}</p>
            </button>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Remove from folder"
              @click="removeDocumentFromFolder(doc.id)"
            />
          </div>
        </section>

        <!-- Picker: add documents from Papra -->
        <section class="pt-1">
          <h3 class="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Add from Papra
          </h3>
          <p v-if="availableDocuments.length === 0" class="px-1 text-sm text-[var(--muted-foreground)]">
            All documents are already in this folder.
          </p>
          <div class="space-y-2">
            <div
              v-for="doc in availableDocuments"
              :key="doc.id"
              class="surface flex items-center gap-3 p-3"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-[var(--foreground)]">{{ doc.name }}</p>
                <p class="text-xs text-[var(--muted-foreground)]">{{ formatBytes(doc.originalSize) }}</p>
              </div>
              <UButton
                icon="i-lucide-plus"
                size="xs"
                variant="soft"
                aria-label="Add to folder"
                @click="addDocumentToFolder(doc.id)"
              />
            </div>
          </div>
        </section>

        <!-- Danger zone -->
        <section class="pt-3">
          <UButton
            icon="i-lucide-folder-minus"
            color="error"
            variant="soft"
            block
            @click="deleteFolder"
          >
            Delete folder (documents are kept)
          </UButton>
        </section>
      </template>

      <!-- ================= Folders list view ================= -->
      <template v-else>
        <div v-if="isLoading" class="space-y-3 pt-2">
          <USkeleton class="h-20 w-full rounded-2xl" />
          <USkeleton class="h-20 w-full rounded-2xl" />
          <USkeleton class="h-20 w-full rounded-2xl" />
        </div>

        <div v-else-if="folders.length === 0" class="mt-10 flex flex-col items-center gap-3 text-center">
          <span class="grid size-16 place-items-center rounded-3xl bg-[var(--primary)]/10">
            <UIcon name="i-lucide-folder-open" class="size-8 text-[var(--primary)]" />
          </span>
          <h2 class="text-lg font-semibold text-[var(--foreground)]">No folders yet</h2>
          <p class="max-w-xs text-sm text-[var(--muted-foreground)]">
            Create a folder for each request — “Mortgage docs”, “School forms” — then fill it with documents from Papra.
          </p>
          <UButton icon="i-lucide-folder-plus" class="mt-1" @click="isCreateOpen = true">
            Create your first folder
          </UButton>
        </div>

        <button
          v-for="folder in folders"
          :key="folder.tag.id"
          class="surface flex w-full items-center gap-3 p-4 text-left transition-transform active:scale-[0.99]"
          @click="openFolder(folder)"
        >
          <span
            class="grid size-11 shrink-0 place-items-center rounded-2xl"
            :style="{ backgroundColor: `${folder.tag.color}22`, color: folder.tag.color }"
          >
            <UIcon name="i-lucide-folder" class="size-5" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-[var(--foreground)]">{{ folder.name }}</span>
            <span class="block text-xs text-[var(--muted-foreground)]">
              {{ folder.documentIds.size }} document{{ folder.documentIds.size === 1 ? '' : 's' }}
            </span>
          </span>
          <UIcon name="i-lucide-chevron-right" class="size-5 shrink-0 text-[var(--muted-foreground)]" />
        </button>

        <button
          class="dashed-add flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-accented)] p-4 text-sm font-medium text-[var(--muted-foreground)] active:bg-[var(--muted)]"
          @click="isCreateOpen = true"
        >
          <UIcon name="i-lucide-folder-plus" class="size-4" />
          New folder
        </button>
      </template>
    </main>

    <!-- Create folder modal -->
    <UModal v-model:open="isCreateOpen" title="New folder" description="Stored in Papra as a neat, named group">
      <template #body>
        <div class="space-y-3">
          <UInput
            v-model="newFolderName"
            size="lg"
            placeholder="e.g. Mortgage docs"
            autofocus
            :maxlength="48"
            @keydown.enter="isValidName && createFolder()"
          />
          <p class="text-xs text-[var(--muted-foreground)]">
            You'll pick which Papra documents go inside right after.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="isCreateOpen = false" />
          <UButton label="Create folder" :loading="isCreating" :disabled="!isValidName" @click="createFolder" />
        </div>
      </template>
    </UModal>
  </div>
</template>
