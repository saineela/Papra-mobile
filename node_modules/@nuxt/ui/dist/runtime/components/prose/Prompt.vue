<script>
import theme from "#build/ui/prose/prompt";
</script>

<script setup>
import { computed } from "vue";
import { useClipboard } from "@vueuse/core";
import { useAppConfig } from "#imports";
import { useComponentProps } from "../../composables/useComponentProps";
import { useLocale } from "../../composables/useLocale";
import { getSlotChildrenText } from "../../utils";
import { tv } from "../../utils/tv";
import UIcon from "../Icon.vue";
import UButton from "../Button.vue";
defineOptions({ inheritAttrs: false });
const _props = defineProps({
  description: { type: String, required: false },
  icon: { type: null, required: false },
  actions: { type: Array, required: false, default: () => [] },
  class: { type: null, required: false },
  ui: { type: Object, required: false }
});
const slots = defineSlots();
const props = useComponentProps("prose.prompt", _props);
const { t } = useLocale();
const { copy, copied } = useClipboard();
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: theme, ...appConfig.ui?.prose?.prompt || {} })());
const actions = computed(() => [.../* @__PURE__ */ new Set(["copy", ...props.actions])]);
function getPromptText() {
  const children = slots.default?.();
  return children ? getSlotChildrenText(children).trim() : "";
}
function copyPrompt() {
  copy(getPromptText());
}
function openInCursor() {
  window.open(`cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(getPromptText())}`, "_self");
}
function openInWindsurf() {
  window.open(`windsurf://cascade/newChat?prompt=${encodeURIComponent(getPromptText())}`, "_self");
}
function openInClaude() {
  window.open(`claude://code/new?q=${encodeURIComponent(getPromptText())}`, "_self");
}
</script>

<template>
  <div :class="ui.root({ class: [props.ui?.root, props.class] })" v-bind="$attrs">
    <UIcon v-if="props.icon" :name="props.icon" :class="ui.icon({ class: props.ui?.icon })" />

    <div :class="ui.content({ class: props.ui?.content })">
      <p v-if="props.description" :class="ui.description({ class: props.ui?.description })">
        {{ props.description }}
      </p>
    </div>

    <div :class="ui.actions({ class: props.ui?.actions })">
      <UButton
        v-if="actions.includes('copy')"
        :icon="copied ? appConfig.ui.icons.copyCheck : appConfig.ui.icons.copy"
        size="sm"
        :label="t('prose.prompt.copy')"
        @click="copyPrompt"
      />

      <UButton
        v-if="actions.includes('cursor')"
        icon="i-simple-icons-cursor"
        color="neutral"
        variant="outline"
        size="sm"
        :label="t('prose.prompt.openIn', { name: 'Cursor' })"
        @click="openInCursor"
      />

      <UButton
        v-if="actions.includes('windsurf')"
        icon="i-simple-icons-windsurf"
        color="neutral"
        variant="outline"
        size="sm"
        :label="t('prose.prompt.openIn', { name: 'Windsurf' })"
        @click="openInWindsurf"
      />

      <UButton
        v-if="actions.includes('claude')"
        icon="i-simple-icons-claude"
        color="neutral"
        variant="outline"
        size="sm"
        :label="t('prose.prompt.openIn', { name: 'Claude' })"
        @click="openInClaude"
      />
    </div>
  </div>
</template>
