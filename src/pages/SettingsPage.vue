<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import { createOrganization } from '@/api/client'
import { useConnectionStore, useDocumentsStore } from '@/stores/app'
import { useAppStore } from '@/stores/theme'
import { formatBytes } from '@/utils/format'

const router = useRouter()
const toast = useToast()
const connectionStore = useConnectionStore()
const documentsStore = useDocumentsStore()
const appStore = useAppStore()

const isSwitchingOrg = ref(false)
const aboutOpen = ref(false)
const disconnectOpen = ref(false)
const orgPickerOpen = ref(false)

/* ------------------------------ new organization ------------------------------ */

const newOrgOpen = ref(false)
const newOrgName = ref('')
const isCreatingOrg = ref(false)
const isNewOrgNameValid = computed(() => {
  const name = newOrgName.value.trim()
  return name.length >= 1 && name.length <= 48
})

async function createNewOrganization() {
  const name = newOrgName.value.trim()
  if (!name) return
  isCreatingOrg.value = true
  try {
    const org = await createOrganization(name)
    await connectionStore.reloadOrganizations()
    await switchOrganization(org.id)
    newOrgName.value = ''
    newOrgOpen.value = false
    orgPickerOpen.value = false
    toast.add({ title: 'Organization created', description: name, color: 'success' })
  }
  catch {
    toast.add({ title: 'Could not create organization', color: 'error' })
  }
  finally {
    isCreatingOrg.value = false
  }
}

/* --------------------------- Cloudflare Access --------------------------- */

const cfOpen = ref(false)
const cfClientId = ref('')
const cfClientSecret = ref('')
const isSavingCf = ref(false)

function openCloudflareEditor() {
  cfClientId.value = connectionStore.connection?.cfAccessClientId ?? ''
  cfClientSecret.value = ''
  cfOpen.value = true
}

async function saveCloudflare() {
  const clientId = cfClientId.value.trim()
  const clientSecret = cfClientSecret.value.trim()
  if (!clientId || !clientSecret) {
    toast.add({ title: 'Enter both the client ID and secret', color: 'warning' })
    return
  }
  isSavingCf.value = true
  try {
    await connectionStore.setCloudflareAccess(clientId, clientSecret)
    cfOpen.value = false
    toast.add({ title: 'Service token saved', color: 'success' })
  }
  catch (error) {
    toast.add({
      title: 'Could not verify the service token',
      description: error instanceof Error ? error.message : undefined,
      color: 'error',
    })
  }
  finally {
    isSavingCf.value = false
  }
}

async function clearCloudflare() {
  isSavingCf.value = true
  try {
    await connectionStore.setCloudflareAccess('', '')
    cfOpen.value = false
    toast.add({ title: 'Service token removed', color: 'neutral' })
  }
  catch {
    toast.add({ title: 'Could not remove the service token', color: 'error' })
  }
  finally {
    isSavingCf.value = false
  }
}

const maskedUrl = computed(() => {
  try {
    const url = new URL(connectionStore.connection?.baseUrl ?? '')
    return url.host
  } catch {
    return connectionStore.connection?.baseUrl ?? ''
  }
})

const modeLabel = computed(() =>
  connectionStore.connection?.mode === 'apiKey' ? 'API key' : 'Email session',
)

const storageUsed = computed(() =>
  documentsStore.stats ? formatBytes(documentsStore.stats.documentsSize) : null,
)

async function switchOrganization(organizationId: string) {
  if (organizationId === connectionStore.activeOrganizationId) return
  isSwitchingOrg.value = true
  try {
    await connectionStore.setActiveOrganization(organizationId)
    toast.add({
      title: 'Switched organization',
      description: connectionStore.activeOrganization?.name,
      color: 'success',
    })
  } finally {
    isSwitchingOrg.value = false
  }
}

async function confirmDisconnect() {
  await connectionStore.disconnect()
  disconnectOpen.value = false
  router.replace({ name: 'connect' })
}
</script>

<template>
  <div class="min-h-dvh pb-28">
    <header class="safe-top">
      <div class="mx-auto max-w-lg px-4 pt-5 pb-3">
        <h1 class="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Settings</h1>
        <p class="mt-0.5 text-sm text-[var(--muted-foreground)]">Connection, appearance, about</p>
      </div>
    </header>

    <main class="mx-auto max-w-lg space-y-5 px-4">
      <!-- Account -->
      <section class="surface p-4">
        <div class="flex items-center gap-3">
          <span class="flex size-11 items-center justify-center rounded-full bg-[var(--primary-scale)] text-sm font-semibold text-[var(--primary)]">
            {{ (connectionStore.user?.name ?? connectionStore.user?.email ?? 'P').slice(0, 2).toUpperCase() }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-[var(--foreground)]">
              {{ connectionStore.user?.name ?? 'API key user' }}
            </p>
            <p class="truncate text-xs text-[var(--muted-foreground)]">
              {{ connectionStore.user?.email ?? maskedUrl }}
            </p>
          </div>
        </div>
      </section>

      <!-- Server -->
      <section>
        <h2 class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Server
        </h2>
        <div class="surface divide-y divide-[var(--border-accented)]">
          <div class="flex items-center justify-between p-4">
            <span class="text-sm text-[var(--foreground)]">Address</span>
            <span class="max-w-48 truncate text-sm text-[var(--muted-foreground)]">{{ maskedUrl }}</span>
          </div>
          <div class="flex items-center justify-between p-4">
            <span class="text-sm text-[var(--foreground)]">Auth mode</span>
            <UBadge :color="connectionStore.connection?.mode === 'apiKey' ? 'warning' : 'success'" variant="subtle">
              {{ modeLabel }}
            </UBadge>
          </div>
          <div v-if="storageUsed" class="flex items-center justify-between p-4">
            <span class="text-sm text-[var(--foreground)]">Storage used</span>
            <span class="text-sm text-[var(--muted-foreground)]">{{ storageUsed }}</span>
          </div>
        </div>
      </section>

      <!-- Organization switcher -->
      <section v-if="connectionStore.organizations.length">
        <h2 class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Organization
        </h2>
        <div class="surface divide-y divide-[var(--border-accented)]">
          <button
            v-for="org in connectionStore.organizations"
            :key="org.id"
            class="flex w-full items-center justify-between p-4 text-left transition-colors active:bg-[var(--muted)]"
            :disabled="isSwitchingOrg"
            @click="switchOrganization(org.id)"
          >
            <span class="text-sm" :class="org.id === connectionStore.activeOrganizationId ? 'font-medium text-[var(--primary)]' : 'text-[var(--foreground)]'">
              {{ org.name }}
            </span>
            <UIcon
              v-if="org.id === connectionStore.activeOrganizationId"
              name="i-lucide-circle-check"
              class="size-4 text-[var(--primary)]"
            />
          </button>
          <button
            class="flex w-full items-center gap-3 p-4 text-left active:bg-[var(--muted)]"
            @click="newOrgOpen = true"
          >
            <UIcon name="i-lucide-plus" class="size-4 text-[var(--primary)]" />
            <span class="text-sm text-[var(--primary)]">New organization</span>
          </button>
        </div>
        <p class="mt-2 px-1 text-xs text-[var(--muted-foreground)]">
          Switching reloads documents, tags and storage for that organization.
        </p>
      </section>

      <!-- Cloudflare Access -->
      <section>
        <h2 class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Cloudflare Access
        </h2>
        <div class="surface divide-y divide-[var(--border-accented)]">
          <button class="flex w-full items-center justify-between p-4 text-left active:bg-[var(--muted)]" @click="openCloudflareEditor">
            <span class="flex min-w-0 items-center gap-3 text-sm text-[var(--foreground)]">
              <UIcon name="i-lucide-cloud" class="size-4 text-[var(--muted-foreground)]" />
              Service token
            </span>
            <span class="flex items-center gap-2">
              <UBadge
                :color="connectionStore.hasCloudflareToken ? 'success' : 'neutral'"
                variant="subtle"
              >
                {{ connectionStore.hasCloudflareToken ? connectionStore.cloudflareMaskedClientId : 'Not set' }}
              </UBadge>
              <UIcon name="i-lucide-chevron-right" class="size-4 text-[var(--muted-foreground)]" />
            </span>
          </button>
        </div>
        <p class="mt-2 px-1 text-xs text-[var(--muted-foreground)]">
          Required when your server is published through a Cloudflare Zero Trust Access app.
        </p>
      </section>

      <!-- Appearance -->
      <section>
        <h2 class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Appearance
        </h2>
        <div class="surface p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--foreground)]">Theme</span>
            <div class="flex gap-1 rounded-full bg-[var(--background)] p-1">
              <button
                class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                :class="appStore.theme === 'dark' ? 'bg-[var(--primary-scale)] text-[var(--primary)]' : 'text-[var(--muted-foreground)]'"
                @click="appStore.applyTheme('dark')"
              >
                <UIcon name="i-lucide-moon" class="size-3.5" />
                Dark
              </button>
              <button
                class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                :class="appStore.theme === 'light' ? 'bg-[var(--primary-scale)] text-[var(--primary)]' : 'text-[var(--muted-foreground)]'"
                @click="appStore.applyTheme('light')"
              >
                <UIcon name="i-lucide-sun" class="size-3.5" />
                Light
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick links -->
      <section>
        <h2 class="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Library
        </h2>
        <div class="surface divide-y divide-[var(--border-accented)]">
          <RouterLink
            to="/trash"
            class="flex items-center justify-between p-4 active:bg-[var(--muted)]"
          >
            <span class="flex items-center gap-3 text-sm text-[var(--foreground)]">
              <UIcon name="i-lucide-trash-2" class="size-4 text-[var(--muted-foreground)]" />
              Trash
            </span>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-[var(--muted-foreground)]" />
          </RouterLink>
          <button class="flex w-full items-center justify-between p-4 active:bg-[var(--muted)]" @click="aboutOpen = true">
            <span class="flex items-center gap-3 text-sm text-[var(--foreground)]">
              <UIcon name="i-lucide-info" class="size-4 text-[var(--muted-foreground)]" />
              About Papra
            </span>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-[var(--muted-foreground)]" />
          </button>
        </div>
      </section>

      <UButton
        label="Disconnect"
        color="error"
        variant="soft"
        block
        size="lg"
        icon="i-lucide-log-out"
        class="mt-2"
        @click="disconnectOpen = true"
      />
    </main>

    <!-- About modal -->
    <UModal v-model:open="aboutOpen" title="Papra">
      <template #body>
        <div class="space-y-3 text-sm text-[var(--muted-foreground)]">
          <p>
            An unofficial, privacy-first client for your self-hosted Papra document server.
            Built with Vue, Nuxt UI and Capacitor.
          </p>
          <p>
            Papra is an open-source document management platform by papra-hq. This app is not
            affiliated with or endorsed by the Papra team.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end">
          <UButton label="Close" color="neutral" variant="ghost" @click="aboutOpen = false" />
        </div>
      </template>
    </UModal>

    <!-- Cloudflare Access editor -->
    <UModal v-model:open="cfOpen" title="Cloudflare Access service token">
      <template #body>
        <div class="space-y-3">
          <p class="text-xs leading-relaxed text-[var(--muted-foreground)]">
            Sent as <code>CF-Access-Client-Id</code> and <code>CF-Access-Client-Secret</code> on
            every request. Create the token in Cloudflare Zero Trust → Access → Service Auth.
          </p>
          <UFormField label="Client ID">
            <UInput v-model="cfClientId" size="lg" class="w-full" placeholder="xxxxxxxx.access" />
          </UFormField>
          <UFormField
            label="Client secret"
            :hint="connectionStore.hasCloudflareToken ? 'Re-enter to replace the stored secret' : undefined"
          >
            <UInput v-model="cfClientSecret" type="password" size="lg" class="w-full" placeholder="••••••••" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full items-center justify-between gap-2">
          <UButton
            v-if="connectionStore.hasCloudflareToken"
            label="Remove"
            color="error"
            variant="ghost"
            :loading="isSavingCf"
            @click="clearCloudflare"
          />
          <span v-else />
          <div class="flex gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="cfOpen = false" />
            <UButton label="Save & verify" :loading="isSavingCf" @click="saveCloudflare" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- New organization -->
    <UModal v-model:open="newOrgOpen" title="New organization" description="A separate space for its own documents and tags">
      <template #body>
        <UInput
          v-model="newOrgName"
          size="lg"
          class="w-full"
          placeholder="e.g. Family records"
          :maxlength="48"
          @keydown.enter="isNewOrgNameValid && createNewOrganization()"
        />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="newOrgOpen = false" />
          <UButton
            label="Create"
            :loading="isCreatingOrg"
            :disabled="!isNewOrgNameValid"
            @click="createNewOrganization"
          />
        </div>
      </template>
    </UModal>

    <!-- Disconnect confirm -->
    <UModal v-model:open="disconnectOpen" title="Disconnect?">
      <template #body>
        <p class="text-sm text-[var(--muted-foreground)]">
          Your server address and credentials will be removed from this device.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="disconnectOpen = false" />
          <UButton label="Disconnect" color="error" @click="confirmDisconnect" />
        </div>
      </template>
    </UModal>
  </div>
</template>
