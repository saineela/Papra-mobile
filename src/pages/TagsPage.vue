<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import { createTag, deleteTag, listTags, updateTag } from '@/api/client'
import { useConnectionStore, useDocumentsStore } from '@/stores/app'
import { TAG_COLOR_CHOICES } from '@/utils/format'
import type { PapraTag } from '@/types/papra'

const toast = useToast()
const connectionStore = useConnectionStore()
const documentsStore = useDocumentsStore()

const isLoading = ref(true)
const isFormOpen = ref(false)
const editingTag = ref<PapraTag | null>(null)
const tagName = ref('')
const tagColor = ref(TAG_COLOR_CHOICES[0])
const isSaving = ref(false)
const deleteCandidate = ref<PapraTag | null>(null)
const isDeleteOpen = computed({
  get: () => deleteCandidate.value !== null,
  set: (value: boolean) => {
    if (!value) deleteCandidate.value = null
  },
})

const orgId = computed(() => connectionStore.activeOrganizationId)

const tagUsage = computed(() => {
  const usage = new Map<string, number>()
  for (const doc of documentsStore.documents) {
    for (const tag of doc.tags ?? []) {
      usage.set(tag.id, (usage.get(tag.id) ?? 0) + 1)
    }
  }
  return usage
})

async function load() {
  if (!orgId.value) return
  isLoading.value = true
  try {
    const tags = await listTags(orgId.value)
    tags.forEach((tag) => documentsStore.upsertTag(tag))
  } catch {
    toast.add({ title: 'Could not load tags', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

function openCreate() {
  editingTag.value = null
  tagName.value = ''
  tagColor.value = TAG_COLOR_CHOICES[Math.floor(Math.random() * TAG_COLOR_CHOICES.length)]
  isFormOpen.value = true
}

function openEdit(tag: PapraTag) {
  editingTag.value = tag
  tagName.value = tag.name
  tagColor.value = tag.color
  isFormOpen.value = true
}

async function saveTag() {
  if (!orgId.value || !tagName.value.trim()) return
  isSaving.value = true
  try {
    if (editingTag.value) {
      const updated = await updateTag(orgId.value, editingTag.value.id, {
        name: tagName.value.trim(),
        color: tagColor.value,
      })
      documentsStore.upsertTag(updated)
      toast.add({ title: 'Tag updated', color: 'success' })
    } else {
      const created = await createTag(orgId.value, {
        name: tagName.value.trim(),
        color: tagColor.value,
      })
      documentsStore.upsertTag(created)
      toast.add({ title: 'Tag created', color: 'success' })
    }
    isFormOpen.value = false
  } catch {
    toast.add({ title: 'Could not save tag', color: 'error' })
  } finally {
    isSaving.value = false
  }
}

async function confirmDelete() {
  if (!orgId.value || !deleteCandidate.value) return
  try {
    await deleteTag(orgId.value, deleteCandidate.value.id)
    documentsStore.removeTagFromAll(deleteCandidate.value.id)
    toast.add({ title: 'Tag deleted', color: 'success' })
  } catch {
    toast.add({ title: 'Could not delete tag', color: 'error' })
  } finally {
    deleteCandidate.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-dvh pb-28">
    <header class="safe-top">
      <div class="mx-auto flex max-w-lg items-center justify-between px-4 pt-5 pb-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Tags</h1>
          <p class="mt-0.5 text-sm text-[var(--muted-foreground)]">
            {{ documentsStore.tags.length }} tag{{ documentsStore.tags.length === 1 ? '' : 's' }}
          </p>
        </div>
        <UButton icon="i-lucide-plus" size="sm" aria-label="New tag" @click="openCreate" />
      </div>
    </header>

    <main class="mx-auto max-w-lg space-y-2.5 px-4">
      <div v-if="isLoading" class="space-y-2.5">
        <USkeleton v-for="i in 5" :key="i" class="h-16 w-full rounded-2xl" />
      </div>

      <template v-else-if="documentsStore.tags.length">
        <div
          v-for="tag in documentsStore.tags"
          :key="tag.id"
          class="surface flex items-center gap-3 p-3.5"
        >
          <span class="size-9 shrink-0 rounded-xl" :style="{ backgroundColor: `${tag.color}33`, border: `1px solid ${tag.color}55` }">
            <UIcon name="i-lucide-tag" class="mx-auto size-4 translate-y-2.5" :style="{ color: tag.color }" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-[var(--foreground)]">{{ tag.name }}</p>
            <p class="text-xs text-[var(--muted-foreground)]">
              {{ tagUsage.get(tag.id) ?? 0 }} document{{ (tagUsage.get(tag.id) ?? 0) === 1 ? '' : 's' }}
            </p>
          </div>
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Edit tag"
            @click="openEdit(tag)"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Delete tag"
            @click="deleteCandidate = tag"
          />
        </div>
      </template>

      <div v-else class="rounded-2xl border border-dashed border-[var(--border-accented)] py-16 text-center">
        <UIcon name="i-lucide-tags" class="mx-auto size-10 text-[var(--muted-foreground)]" />
        <p class="mt-3 text-sm font-medium text-[var(--foreground)]">No tags yet</p>
        <p class="mt-1 text-xs text-[var(--muted-foreground)]">Tags keep your documents organized</p>
        <UButton label="Create your first tag" icon="i-lucide-plus" size="sm" class="mt-4" @click="openCreate" />
      </div>
    </main>

    <!-- Create / edit modal -->
    <UModal v-model:open="isFormOpen" :title="editingTag ? 'Edit tag' : 'New tag'">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Name">
            <UInput v-model="tagName" autofocus placeholder="e.g. Receipts" class="w-full" size="lg" @keydown.enter="saveTag" />
          </UFormField>
          <UFormField label="Color">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in TAG_COLOR_CHOICES"
                :key="color"
                class="size-9 rounded-full transition-transform active:scale-90"
                :style="{
                  backgroundColor: color,
                  outline: tagColor === color ? '2px solid var(--foreground)' : 'none',
                  outlineOffset: '2px',
                }"
                :aria-label="`Choose color ${color}`"
                @click="tagColor = color"
              />
            </div>
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="isFormOpen = false" />
          <UButton :label="editingTag ? 'Save' : 'Create'" :loading="isSaving" @click="saveTag" />
        </div>
      </template>
    </UModal>

    <!-- Delete confirmation -->
    <UModal v-model:open="isDeleteOpen" :title="`Delete “${deleteCandidate?.name}”?`">
      <template #body>
        <p class="text-sm text-[var(--muted-foreground)]">
          This removes the tag from all documents. The documents themselves are not deleted.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="deleteCandidate = null" />
          <UButton label="Delete tag" color="error" @click="confirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
