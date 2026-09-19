<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConnectionStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const connectionStore = useConnectionStore()

const tabs = [
  { name: 'dashboard', label: 'Home', icon: 'i-lucide-house' },
  { name: 'ready', label: 'Ready', icon: 'i-lucide-folder-check' },
  { name: 'search', label: 'Search', icon: 'i-lucide-search' },
  { name: 'upload', label: 'Add', icon: 'i-lucide-plus' },
  { name: 'tags', label: 'Tags', icon: 'i-lucide-tags' },
  { name: 'settings', label: 'Settings', icon: 'i-lucide-settings' },
]

const activeTab = computed(() => {
  if (route.name === 'document' || route.name === 'markup-sign') return 'dashboard'
  return String(route.name ?? 'dashboard')
})

const orgName = computed(() => connectionStore.activeOrganization?.name ?? 'Papra')

function go(tabName: string) {
  router.push({ name: tabName })
}
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl safe-bottom"
  >
    <div class="mx-auto grid max-w-lg grid-cols-6 px-2 pt-1.5 pb-1">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        class="group flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors"
        :aria-label="tab.label"
        :aria-current="activeTab === tab.name ? 'page' : undefined"
        @click="go(tab.name)"
      >
        <span
          class="flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200"
          :class="
            activeTab === tab.name
              ? 'bg-[var(--primary-scale)] text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] group-active:bg-[var(--muted)]'
          "
        >
          <UIcon :name="tab.icon" class="size-5.5 shrink-0" :class="{ 'scale-110': tab.name === 'upload' }" />
        </span>
        <span
          class="text-[10px] font-medium tracking-wide"
          :class="activeTab === tab.name ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'"
        >
          {{ tab.label }}
        </span>
      </button>
    </div>
  </nav>
</template>
