<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import { useConnectionStore, useDocumentsStore } from '@/stores/app'
import { formatBytes } from '@/utils/format'
import DocumentCard from '@/components/DocumentCard.vue'
import StatPill from '@/components/StatPill.vue'

const router = useRouter()
const toast = useToast()
const connectionStore = useConnectionStore()
const documentsStore = useDocumentsStore()

const isRefreshing = ref(false)

/* ----------------------------- org switching ----------------------------- */

const orgPickerOpen = ref(false)
const isSwitchingOrg = ref(false)

async function switchOrganization(organizationId: string) {
  if (organizationId === connectionStore.activeOrganizationId) {
    orgPickerOpen.value = false
    return
  }
  isSwitchingOrg.value = true
  try {
    await connectionStore.setActiveOrganization(organizationId)
    orgPickerOpen.value = false
    toast.add({ title: 'Switched organization', color: 'success' })
  }
  catch {
    toast.add({ title: 'Could not switch organization', color: 'error' })
  }
  finally {
    isSwitchingOrg.value = false
  }
}

const orgId = computed(() => connectionStore.activeOrganizationId)
const recentDocuments = computed(() => documentsStore.applyClientFilters(documentsStore.documents).slice(0, 8))
const untaggedCount = computed(
  () => documentsStore.documents.filter((doc) => !doc.tags || doc.tags.length === 0).length,
)

const userFirstName = computed(() => {
  const name = connectionStore.user?.name ?? ''
  return name.split(/\s+/)[0] || 'there'
})

async function refresh() {
  if (!orgId.value) return
  isRefreshing.value = true
  try {
    await documentsStore.refresh(orgId.value)
  } catch {
    toast.add({ title: 'Refresh failed', description: 'Check your connection.', color: 'error' })
  } finally {
    isRefreshing.value = false
  }
}

onMounted(() => {
  if (orgId.value && documentsStore.documents.length === 0) {
    refresh()
  }
})
</script>

<template>
  <div class="min-h-dvh pb-28">
    <header class="safe-top">
      <div class="mx-auto max-w-lg px-4 pt-5 pb-2">
        <div class="flex items-start justify-between">
          <div class="min-w-0">
            <button
              class="flex max-w-full items-center gap-1 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]"
              aria-label="Switch organization"
              @click="orgPickerOpen = true"
            >
              <span class="truncate">{{ connectionStore.activeOrganization?.name ?? 'Papra' }}</span>
              <UIcon name="i-lucide-chevrons-up-down" class="size-3.5 shrink-0" />
            </button>
            <h1 class="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Hey {{ userFirstName }} 👋
            </h1>
          </div>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="isRefreshing"
            aria-label="Refresh"
            @click="refresh"
          />
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-lg space-y-6 px-4">
      <!-- Stats -->
      <section v-if="documentsStore.stats" class="grid grid-cols-3 gap-2.5">
        <StatPill
          label="Documents"
          :value="String(documentsStore.stats.documentsCount)"
          icon="i-lucide-files"
        />
        <StatPill
          label="Storage"
          :value="formatBytes(documentsStore.stats.documentsSize)"
          icon="i-lucide-hard-drive"
        />
        <StatPill
          label="Trash"
          :value="String(documentsStore.stats.deletedDocumentsCount)"
          icon="i-lucide-trash-2"
        />
      </section>

      <!-- Smart inbox -->
      <button
        v-if="untaggedCount > 0"
        class="flex w-full items-center gap-3 rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary-scale)] p-4 text-left transition-colors active:bg-[var(--primary-scale)]/60"
        @click="router.push({ name: 'search', query: { untagged: '1' } })"
      >
        <span class="flex size-10 items-center justify-center rounded-xl bg-[var(--primary)]/20">
          <UIcon name="i-lucide-inbox" class="size-5 text-[var(--primary)]" />
        </span>
        <span class="flex-1">
          <span class="block text-sm font-medium text-[var(--foreground)]">Smart Inbox</span>
          <span class="block text-xs text-[var(--muted-foreground)]">
            {{ untaggedCount }} document{{ untaggedCount === 1 ? '' : 's' }} waiting to be tagged
          </span>
        </span>
        <UIcon name="i-lucide-chevron-right" class="size-4 text-[var(--muted-foreground)]" />
      </button>

      <!-- Recent documents -->
      <section>
        <div class="mb-2.5 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-[var(--foreground)]">Recent documents</h2>
          <UButton
            label="Search all"
            variant="link"
            size="xs"
            trailing-icon="i-lucide-arrow-right"
            @click="router.push({ name: 'search' })"
          />
        </div>

        <div v-if="documentsStore.isLoading" class="space-y-2.5">
          <USkeleton v-for="i in 4" :key="i" class="h-[74px] w-full rounded-2xl" />
        </div>

        <div v-else-if="recentDocuments.length" class="space-y-2.5">
          <DocumentCard
            v-for="doc in recentDocuments"
            :key="doc.id"
            :document="doc"
            @open="(id) => router.push({ name: 'document', params: { id } })"
          />
        </div>

        <div v-else class="rounded-2xl border border-dashed border-[var(--border-accented)] py-12 text-center">
          <UIcon name="i-lucide-file-plus-2" class="mx-auto size-10 text-[var(--muted-foreground)]" />
          <p class="mt-3 text-sm font-medium text-[var(--foreground)]">No documents yet</p>
          <p class="mt-1 text-xs text-[var(--muted-foreground)]">
            Upload your first document to get started
          </p>
          <UButton
            label="Add document"
            icon="i-lucide-plus"
            size="sm"
            class="mt-4"
            @click="router.push({ name: 'upload' })"
          />
        </div>
      </section>
    </main>

    <!-- Organization picker -->
    <UModal v-model:open="orgPickerOpen" title="Switch organization">
      <template #body>
        <div class="space-y-1">
          <button
            v-for="org in connectionStore.organizations"
            :key="org.id"
            class="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left active:bg-[var(--muted)]"
            :disabled="isSwitchingOrg"
            @click="switchOrganization(org.id)"
          >
            <span
              class="truncate text-sm"
              :class="org.id === connectionStore.activeOrganizationId ? 'font-medium text-[var(--primary)]' : 'text-[var(--foreground)]'"
            >
              {{ org.name }}
            </span>
            <UIcon
              v-if="org.id === connectionStore.activeOrganizationId"
              name="i-lucide-circle-check"
              class="size-4 shrink-0 text-[var(--primary)]"
            />
          </button>
          <p v-if="!connectionStore.organizations.length" class="text-sm text-[var(--muted-foreground)]">
            No organizations available.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-between gap-2">
          <UButton
            label="Manage"
            color="neutral"
            variant="ghost"
            icon="i-lucide-settings"
            @click="orgPickerOpen = false; router.push({ name: 'settings' })"
          />
          <UButton label="Close" color="neutral" variant="ghost" @click="orgPickerOpen = false" />
        </div>
      </template>
    </UModal>
  </div>
</template>
