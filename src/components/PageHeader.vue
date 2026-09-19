<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="safe-top">
    <div class="mx-auto flex max-w-lg items-end justify-between px-4 pt-4 pb-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="mt-0.5 text-sm text-[var(--muted-foreground)]">
          {{ subtitle }}
        </p>
      </div>
      <div class="flex items-center gap-1.5">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
