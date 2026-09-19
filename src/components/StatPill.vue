<script setup lang="ts">
defineProps<{
  label: string
  value: string
  icon: string
}>()
</script>

<template>
  <div class="surface flex flex-col gap-1 p-3.5">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium text-[var(--muted-foreground)]">{{ label }}</span>
      <UIcon :name="icon" class="size-4 text-[var(--primary)]" />
    </div>
    <span class="text-xl font-semibold tracking-tight text-[var(--foreground)]">{{ value }}</span>
  </div>
</template>
