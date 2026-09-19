<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import { useConnectionStore, useDocumentsStore } from '@/stores/app'
import DocumentCard from '@/components/DocumentCard.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const connectionStore = useConnectionStore()
const documentsStore = useDocumentsStore()

const query = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const showFilters = ref(false)
const showSortSheet = ref(false)
const isSearching = ref(false)

const orgId = computed(() => connectionStore.activeOrganizationId)

const sortOptions = [
  { label: 'Newest first', value: 'createdAt:desc', icon: 'i-lucide-arrow-down-wide-narrow' },
  { label: 'Oldest first', value: 'createdAt:asc', icon: 'i-lucide-arrow-up-narrow-wide' },
  { label: 'Recently updated', value: 'updatedAt:desc', icon: 'i-lucide-history' },
  { label: 'Name A → Z', value: 'name:asc', icon: 'i-lucide-arrow-down-a-z' },
  { label: 'Name Z → A', value: 'name:desc', icon: 'i-lucide-arrow-up-z-a' },
]

const activeSort = computed(
  () =>
    sortOptions.find(
      (option) =>
        option.value === `${documentsStore.sortField}:${documentsStore.sortOrder}`,
    ) ?? sortOptions[0],
)

const isUntaggedFilter = computed(() => route.query.untagged === '1')

const filteredDocuments = computed(() => documentsStore.applyClientFilters(documentsStore.documents))

const filterCount = computed(() => {
  let count = 0
  if (documentsStore.selectedTagId) count += 1
  if (isUntaggedFilter.value) count += 1
  return count
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => runSearch(), 350)
})

watch(isUntaggedFilter, (value) => {
  documentsStore.showUntagged = value
})

async function runSearch() {
  if (!orgId.value) return
  isSearching.value = true
  try {
    await documentsStore.search(orgId.value, query.value.trim())
  } catch {
    toast.add({ title: 'Search failed', description: 'Try again in a moment.', color: 'error' })
  } finally {
    isSearching.value = false
  }
}

function toggleTag(tagId: string) {
  documentsStore.selectedTagId = documentsStore.selectedTagId === tagId ? null : tagId
}

function pickSort(value: string) {
  const [field, order] = value.split(':')
  documentsStore.sortField = field as typeof documentsStore.sortField
  documentsStore.sortOrder = order as typeof documentsStore.sortOrder
  showSortSheet.value = false
  runSearch()
}

function clearFilters() {
  documentsStore.selectedTagId = null
  documentsStore.showUntagged = false
  router.replace({ query: {} })
}

onMounted(async () => {
  if (orgId.value && documentsStore.documents.length === 0) {
    await runSearch()
  }
  documentsStore.showUntagged = isUntaggedFilter.value
})
</script>

<template>
  <div class="min-h-dvh pb-28">
    <header class="safe-top sticky top-0 z-30 bg-[var(--background)]/95 backdrop-blur-xl">
      <div class="mx-auto max-w-lg px-4 pt-4 pb-3">
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Back"
            @click="router.back()"
          />
          <UInput
            v-model="query"
            icon="i-lucide-search"
            placeholder="Search your documents…"
            size="lg"
            class="flex-1"
            autocomplete="off"
            :ui="{ root: 'w-full' }"
          />
          <UButton
            icon="i-lucide-arrow-down-up"
            color="neutral"
            variant="soft"
            size="sm"
            aria-label="Sort"
            @click="showSortSheet = true"
          />
        </div>

        <!-- Filter chips -->
        <div v-if="documentsStore.tags.length" class="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4">
          <button
            class="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            :class="
              documentsStore.selectedTagId === null && !isUntaggedFilter
                ? 'bg-[var(--primary)] text-[var(--ui-text-highlighted)]'
                : 'border border-[var(--border-accented)] bg-[var(--muted)] text-[var(--muted-foreground)]'
            "
            @click="clearFilters"
          >
            All
          </button>
          <button
            class="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            :class="
              isUntaggedFilter
                ? 'bg-[var(--primary)] text-[var(--ui-text-highlighted)]'
                : 'border border-dashed border-[var(--border-accented)] bg-[var(--muted)] text-[var(--muted-foreground)]'
            "
            @click="router.replace({ query: isUntaggedFilter ? {} : { untagged: '1' } })"
          >
            <UIcon name="i-lucide-inbox" class="mr-1 inline size-3" />
            Untagged
          </button>
          <button
            v-for="tag in documentsStore.tags"
            :key="tag.id"
            class="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            :class="
              documentsStore.selectedTagId === tag.id
                ? 'text-white'
                : 'border border-[var(--border-accented)] bg-[var(--muted)] text-[var(--muted-foreground)]'
            "
            :style="documentsStore.selectedTagId === tag.id ? { backgroundColor: tag.color } : {}"
            @click="toggleTag(tag.id)"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-lg space-y-2.5 px-4">
      <div v-if="isSearching && !filteredDocuments.length" class="space-y-2.5 pt-2">
        <USkeleton v-for="i in 5" :key="i" class="h-[74px] w-full rounded-2xl" />
      </div>

      <template v-else>
        <p class="pt-1 text-xs text-[var(--muted-foreground)]">
          {{ filteredDocuments.length }} result{{ filteredDocuments.length === 1 ? '' : 's' }}
          <template v-if="query"> for “{{ query }}”</template>
        </p>

        <DocumentCard
          v-for="doc in filteredDocuments"
          :key="doc.id"
          :document="doc"
          @open="(id) => router.push({ name: 'document', params: { id } })"
        />

        <UButton
          v-if="documentsStore.hasMore && filteredDocuments.length"
          label="Load more"
          color="neutral"
          variant="soft"
          block
          size="lg"
          :loading="documentsStore.isLoadingMore"
          class="mt-2"
          @click="documentsStore.loadMore(orgId!)"
        />

        <div
          v-if="!filteredDocuments.length && !isSearching"
          class="rounded-2xl border border-dashed border-[var(--border-accented)] py-16 text-center"
        >
          <UIcon name="i-lucide-search-x" class="mx-auto size-10 text-[var(--muted-foreground)]" />
          <p class="mt-3 text-sm font-medium text-[var(--foreground)]">No documents found</p>
          <p class="mt-1 text-xs text-[var(--muted-foreground)]">
            Try a different search or clear the filters
          </p>
        </div>
      </template>
    </main>

    <!-- Sort bottom sheet -->
    <UDrawer v-model:open="showSortSheet" title="Sort documents">
      <div class="p-4 space-y-1">
        <button
          v-for="option in sortOptions"
          :key="option.value"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors active:bg-[var(--muted)]"
          @click="pickSort(option.value)"
        >
          <UIcon :name="option.icon" class="size-5 text-[var(--muted-foreground)]" />
          <span class="flex-1 text-sm text-[var(--foreground)]">{{ option.label }}</span>
          <UIcon
            v-if="activeSort.value === option.value"
            name="i-lucide-check"
            class="size-4 text-[var(--primary)]"
          />
        </button>
      </div>
    </UDrawer>
  </div>
</template>
