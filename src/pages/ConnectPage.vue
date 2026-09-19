<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import { useConnectionStore } from '@/stores/app'
import { useAppStore } from '@/stores/theme'
import papraLogo from '@/assets/papra-logo.png'

const router = useRouter()
const toast = useToast()
const connectionStore = useConnectionStore()
const appStore = useAppStore()

const mode = ref<'password' | 'apiKey'>('password')
const baseUrl = ref('')
const email = ref('')
const password = ref('')
const twoFactorCode = ref('')
const apiKey = ref('')
const showApiKey = ref(false)
const needs2fa = ref(false)
const isConnecting = ref(false)
const error = ref<string | null>(null)

// Optional Cloudflare Access service token (needed when the Papra server sits
// behind a Zero Trust application)
const cfEnabled = ref(false)
const cfClientId = ref('')
const cfClientSecret = ref('')

function cloudflareCredentials() {
  if (!cfEnabled.value) return null
  const clientId = cfClientId.value.trim()
  const clientSecret = cfClientSecret.value.trim()
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

async function connect() {
  error.value = null
  if (!baseUrl.value.trim()) {
    error.value = 'Enter your Papra server address first.'
    return
  }

  isConnecting.value = true
  try {
    if (mode.value === 'apiKey') {
      if (!apiKey.value.trim()) {
        error.value = 'Paste your API key to continue.'
        return
      }
      await connectionStore.connectWithApiKey(
        baseUrl.value,
        apiKey.value.trim(),
        cloudflareCredentials(),
      )
    } else {
      if (!email.value.trim() || !password.value) {
        error.value = 'Enter your email and password to continue.'
        return
      }
      try {
        await connectionStore.connectWithPassword(
          baseUrl.value,
          email.value.trim(),
          password.value,
          needs2fa.value ? twoFactorCode.value.trim() : undefined,
          cloudflareCredentials(),
        )
      } catch (connectError) {
        if (connectError instanceof Error && connectError.message === 'two-factor-required') {
          needs2fa.value = true
          error.value = null
          toast.add({
            title: 'Two-factor required',
            description: 'Enter the 6-digit code from your authenticator app.',
            color: 'info',
          })
          return
        }
        throw connectError
      }
    }

    toast.add({ title: 'Connected', description: 'Your documents are ready.', color: 'success' })
    router.replace({ name: 'dashboard' })
  } catch (connectError) {
    error.value =
      connectError instanceof Error
        ? connectError.message
        : 'Could not reach the server. Check the address and try again.'
  } finally {
    isConnecting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-[var(--background)]">
    <div class="safe-top" />

    <div class="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
      <!-- Brand -->
      <div class="mt-16 flex flex-col items-center text-center">
        <img
          :src="papraLogo"
          alt="Papra"
          class="size-16 rounded-2xl object-cover shadow-sm ring-1 ring-black/10"
        />
        <h1 class="mt-5 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Papra
        </h1>
        <p class="mt-2 max-w-xs text-sm leading-relaxed text-[var(--muted-foreground)]">
          Connect to your self-hosted document vault. Everything stays on your server.
        </p>
      </div>

      <!-- Mode switch -->
      <div class="mt-10">
        <div class="grid w-full grid-cols-2 gap-1 rounded-full bg-[var(--muted)] p-1" role="tablist">
          <button
            v-for="option in [
              { label: 'Sign in', value: 'password', icon: 'i-lucide-mail' },
              { label: 'API key', value: 'apiKey', icon: 'i-lucide-key-round' },
            ]"
            :key="option.value"
            role="tab"
            :aria-selected="mode === option.value"
            class="flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors"
            :class="
              mode === option.value
                ? 'bg-[var(--accented)] text-[var(--foreground)] shadow-sm'
                : 'text-[var(--muted-foreground)]'
            "
            @click="mode = option.value as 'password' | 'apiKey'"
          >
            <UIcon :name="option.icon" class="size-4" />
            {{ option.label }}
          </button>
        </div>

        <form class="mt-6 space-y-4" @submit.prevent="connect">
          <UFormField label="Server address" hint="e.g. https://papra.example.com">
            <UInput
              v-model="baseUrl"
              icon="i-lucide-server"
              placeholder="https://your-papra-server.com"
              autocomplete="url"
              inputmode="url"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <template v-if="mode === 'password'">
            <UFormField label="Email">
              <UInput
                v-model="email"
                type="email"
                icon="i-lucide-mail"
                placeholder="you@example.com"
                autocomplete="email"
                inputmode="email"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Password">
              <UInput
                v-model="password"
                type="password"
                icon="i-lucide-key-round"
                placeholder="••••••••"
                autocomplete="current-password"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField v-if="needs2fa" label="Two-factor code">
              <UInput
                v-model="twoFactorCode"
                inputmode="numeric"
                maxlength="6"
                placeholder="123456"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </template>

          <template v-else>
            <UFormField
              label="API key"
              hint="Create one in Papra → Settings → API keys"
            >
              <UInput
                v-model="apiKey"
                :type="showApiKey ? 'text' : 'password'"
                icon="i-lucide-key-round"
                placeholder="papra_..."
                size="lg"
                class="w-full"
                :ui="{ trailing: 'pr-1' }"
              >
                <template #trailing>
                  <UButton
                    :icon="showApiKey ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :padded="false"
                    :aria-label="showApiKey ? 'Hide API key' : 'Show API key'"
                    @click="showApiKey = !showApiKey"
                  />
                </template>
              </UInput>
            </UFormField>
          </template>

          <!-- Cloudflare Access (optional) -->
          <div class="rounded-2xl border border-[var(--border-accented)] p-3">
            <button
              type="button"
              class="flex w-full items-center gap-2 text-left"
              @click="cfEnabled = !cfEnabled"
            >
              <UIcon name="i-lucide-cloud" class="size-4 text-[var(--muted-foreground)]" />
              <span class="flex-1 text-sm font-medium text-[var(--foreground)]">
                Behind Cloudflare Access
              </span>
              <UIcon
                :name="cfEnabled ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="size-4 text-[var(--muted-foreground)]"
              />
            </button>

            <div v-if="cfEnabled" class="mt-3 space-y-3">
              <p class="text-xs leading-relaxed text-[var(--muted-foreground)]">
                Add a Cloudflare Zero Trust service token so every request can pass the
                Access check. Create one under Access → Service Auth.
              </p>
              <UFormField label="Client ID">
                <UInput
                  v-model="cfClientId"
                  placeholder="xxxxxxxx.access"
                  size="lg"
                  class="w-full"
                  autocomplete="off"
                />
              </UFormField>
              <UFormField label="Client secret">
                <UInput
                  v-model="cfClientSecret"
                  type="password"
                  placeholder="••••••••"
                  size="lg"
                  class="w-full"
                  autocomplete="off"
                />
              </UFormField>
            </div>
          </div>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            :title="error"
          />

          <UButton
            type="submit"
            size="lg"
            block
            :loading="isConnecting"
            class="mt-2"
            icon="i-lucide-log-in"
          >
            {{ mode === 'password' ? 'Sign in' : 'Connect with API key' }}
          </UButton>
        </form>
      </div>

      <div class="flex-1" />

      <div class="flex items-center justify-between py-5 text-xs text-[var(--muted-foreground)]">
        <span>Your data never leaves your server</span>
        <UButton
          :icon="appStore.theme === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Toggle theme"
          @click="appStore.toggleTheme()"
        />
      </div>
    </div>
  </div>
</template>
