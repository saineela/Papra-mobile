<script>
import theme from "#build/ui/prose/h1";
</script>

<script setup>
import { computed } from "vue";
import { useAppConfig, useRuntimeConfig } from "#imports";
import { useComponentProps } from "../../composables/useComponentProps";
import { tv } from "../../utils/tv";
const _props = defineProps({
  id: { type: String, required: false },
  anchor: { type: Boolean, required: false },
  class: { type: null, required: false },
  ui: { type: Object, required: false }
});
defineSlots();
const props = useComponentProps("prose.h1", _props);
const appConfig = useAppConfig();
const { headings } = useRuntimeConfig().public?.mdc || {};
const ui = computed(() => tv({ extend: theme, ...appConfig.ui?.prose?.h1 || {} })());
const generate = computed(() => props.id && (props.anchor ?? (typeof headings?.anchorLinks === "boolean" ? headings.anchorLinks : headings?.anchorLinks?.h1) ?? false));
</script>

<template>
  <h1 :id="props.id" :class="ui.base({ class: [props.ui?.base, props.class] })">
    <a v-if="props.id && generate" :href="`#${props.id}`" :class="ui.link({ class: props.ui?.link })">
      <slot />
    </a>
    <slot v-else />
  </h1>
</template>
