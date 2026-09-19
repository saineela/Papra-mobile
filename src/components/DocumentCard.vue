<script setup lang="ts">
import { computed } from 'vue'
import type { PapraDocument, PapraDocumentTag } from '@/types/papra'

const props = defineProps<{
  document: PapraDocument
  compact?: boolean
}>()

const emit = defineEmits<{
  open: [documentId: string]
}>()

const fileIcon = computed(() => {
  const type = props.document.mimeType ?? props.document.contentType ?? ''
  if (type.includes('pdf')) return 'i-lucide-file-text'
  if (type.startsWith('image/')) return 'i-lucide-image'
  if (type.includes('word') || type.includes('document')) return 'i-lucide-file-type'
  if (type.includes('sheet') || type.includes('excel')) return 'i-lucide-sheet'
  if (type.startsWith('text/')) return 'i-lucide-file-code'
  return 'i-lucide-file'
})

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(i > 1 ? 1 : 0)} ${units[i]}`
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const shownTags = computed(() => (props.document.tags ?? []).slice(0, 3))
const extraTagCount = computed(() => Math.max(0, (props.document.tags?.length ?? 0) - 3))
</script>

<template>
  <button
    class="w-full rounded-2xl border border-[var(--border-accented)] bg-[var(--muted)] p-3.5 text-left transition-colors active:bg-[var(--accented)]"
    @click="emit('open', document.id)"
  >
    <div class="flex items-start gap-3">
      <span
        class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-scale)]"
      >
        <UIcon :name="fileIcon" class="size-5 text-[var(--primary)]" />
      </span>

      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-[var(--foreground)]">
          {{ document.name }}
        </p>
        <p class="mt-0.5 text-xs text-[var(--muted-foreground)]">
          {{ formatSize(document.originalSize) }} · {{ formatDate(document.createdAt) }}
        </p>

        <div v-if="shownTags.length" class="mt-2 flex flex-wrap items-center gap-1">
          <span
            v-for="tag in shownTags"
            :key="tag.id"
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
            :style="{ backgroundColor: `${tag.color}22`, color: tag.color }"
          >
            <span class="size-1.5 rounded-full" :style="{ backgroundColor: tag.color }" />
            {{ tag.name }}
          </span>
          <span v-if="extraTagCount > 0" class="text-[10px] text-[var(--muted-foreground)]">
            +{{ extraTagCount }}
          </span>
        </div>
      </div>

      <UIcon name="i-lucide-chevron-right" class="mt-2 size-4 shrink-0 text-[var(--muted-foreground)]" />
    </div>
  </button>
</template>
