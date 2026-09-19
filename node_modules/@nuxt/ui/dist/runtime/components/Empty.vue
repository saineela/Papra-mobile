<script>
import theme from "#build/ui/empty";
</script>

<script setup>
import { computed } from "vue";
import { Primitive } from "reka-ui";
import { useAppConfig } from "#imports";
import { useComponentProps } from "../composables/useComponentProps";
import { tv } from "../utils/tv";
import UAvatar from "./Avatar.vue";
import UButton from "./Button.vue";
const _props = defineProps({
  as: { type: null, required: false },
  icon: { type: null, required: false },
  avatar: { type: Object, required: false },
  loading: { type: Boolean, required: false },
  loadingIcon: { type: null, required: false },
  title: { type: String, required: false },
  description: { type: String, required: false },
  actions: { type: Array, required: false },
  variant: { type: null, required: false },
  size: { type: null, required: false },
  class: { type: null, required: false },
  ui: { type: Object, required: false }
});
const slots = defineSlots();
const props = useComponentProps("empty", _props);
const appConfig = useAppConfig();
const iconName = computed(() => props.loading ? props.loadingIcon || appConfig.ui.icons.loading : props.icon);
const ui = computed(() => tv({ extend: theme, ...appConfig.ui?.empty || {} })({
  variant: props.variant,
  size: props.size,
  loading: props.loading
}));
</script>

<template>
  <Primitive :as="props.as" :aria-busy="props.loading ? 'true' : void 0" data-slot="root" :class="ui.root({ class: [props.ui?.root, props.class] })">
    <div v-if="!!slots.header || (iconName || props.avatar || !!slots.leading) || (props.title || !!slots.title) || (props.description || !!slots.description)" data-slot="header" :class="ui.header({ class: props.ui?.header })">
      <slot name="header">
        <slot name="leading" :ui="ui">
          <UAvatar v-if="iconName || props.avatar" :icon="iconName" v-bind="typeof props.avatar === 'object' ? props.avatar : {}" data-slot="avatar" :class="ui.avatar({ class: props.ui?.avatar })" />
        </slot>

        <h2 v-if="props.title || !!slots.title" data-slot="title" :class="ui.title({ class: props.ui?.title })">
          <slot name="title">
            {{ props.title }}
          </slot>
        </h2>

        <div v-if="props.description || !!slots.description" data-slot="description" :class="ui.description({ class: props.ui?.description })">
          <slot name="description">
            {{ props.description }}
          </slot>
        </div>
      </slot>
    </div>

    <div v-if="!!slots.body || (props.actions?.length || !!slots.actions)" data-slot="body" :class="ui.body({ class: props.ui?.body })">
      <slot name="body">
        <div v-if="props.actions?.length || !!slots.actions" data-slot="actions" :class="ui.actions({ class: props.ui?.actions })">
          <slot name="actions">
            <UButton v-for="(action, index) in props.actions" :key="index" :size="props.size" v-bind="action" />
          </slot>
        </div>
      </slot>
    </div>

    <div v-if="!!slots.footer" data-slot="footer" :class="ui.footer({ class: props.ui?.footer })">
      <slot name="footer" />
    </div>
  </Primitive>
</template>
