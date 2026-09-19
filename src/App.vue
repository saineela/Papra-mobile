<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConnectionStore } from '@/stores/app'
import { useAppStore } from '@/stores/theme'
import AppTabBar from '@/components/AppTabBar.vue'

const route = useRoute()
const router = useRouter()
const connectionStore = useConnectionStore()
const appStore = useAppStore()

// Pages without the bottom tab bar
const hideTabBar = ['connect', 'document', 'markup-sign', 'scan']

onMounted(async () => {
  appStore.initTheme()
  const restored = await connectionStore.restore()
  if (!restored && route.name !== 'connect') {
    router.replace({ name: 'connect' })
  }
})
</script>

<template>
  <UApp>
    <div class="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <RouterView />
      <AppTabBar v-if="!hideTabBar.includes(String(route.name)) && connectionStore.status === 'connected'" />
    </div>
  </UApp>
</template>
