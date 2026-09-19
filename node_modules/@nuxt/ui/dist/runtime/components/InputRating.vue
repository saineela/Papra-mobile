<script>
import theme from "#build/ui/input-rating";
</script>

<script setup>
import { computed } from "vue";
import { RatingRoot, RatingItem, RatingItemIndicator } from "reka-ui";
import { reactivePick } from "@vueuse/core";
import { useAppConfig } from "#imports";
import { useComponentProps } from "../composables/useComponentProps";
import { useForwardProps } from "../composables/useForwardProps";
import { useFormField } from "../composables/useFormField";
import { tv } from "../utils/tv";
import UIcon from "./Icon.vue";
defineOptions({ inheritAttrs: false });
const _props = defineProps({
  as: { type: null, required: false },
  id: { type: String, required: false },
  readonly: { type: Boolean, required: false, default: false },
  icon: { type: null, required: false },
  emptyIcon: { type: null, required: false },
  color: { type: null, required: false },
  size: { type: null, required: false },
  orientation: { type: null, required: false, default: "horizontal" },
  class: { type: null, required: false },
  ui: { type: Object, required: false },
  length: { type: Number, required: false, default: 5 },
  step: { type: Number, required: false, default: 1 },
  name: { type: String, required: false },
  disabled: { type: Boolean, required: false },
  required: { type: Boolean, required: false },
  clearable: { type: Boolean, required: false, default: false },
  hoverable: { type: Boolean, required: false, default: false },
  modelValue: { type: Number, required: false },
  defaultValue: { type: Number, required: false, default: 0 }
});
const emits = defineEmits(["change", "update:modelValue"]);
defineSlots();
const props = useComponentProps("inputRating", _props);
const appConfig = useAppConfig();
const rootProps = useForwardProps(reactivePick(props, "as", "length", "step", "hoverable", "clearable", "required", "modelValue", "defaultValue"), emits);
const { id, emitFormChange, emitFormInput, size: formFieldSize, color: formFieldColor, name, disabled: formFieldDisabled, ariaAttrs } = useFormField(_props);
const color = computed(() => formFieldColor.value ?? props.color);
const size = computed(() => formFieldSize.value ?? props.size);
const disabled = computed(() => formFieldDisabled.value ?? props.disabled);
const rootDisabled = computed(() => disabled.value || props.readonly);
const ui = computed(() => tv({ extend: theme, ...appConfig.ui?.inputRating || {} })({
  size: size.value,
  color: color.value,
  orientation: props.orientation,
  readonly: props.readonly && !disabled.value,
  disabled: disabled.value
}));
const starIcon = computed(() => props.icon ?? appConfig.ui.icons.star);
function onUpdate(value) {
  const event = new Event("change", { target: { value } });
  emits("change", event);
  emitFormChange();
  emitFormInput();
}
</script>

<template>
  <RatingRoot
    :id="id"
    v-slot="{ items }"
    data-slot="root"
    v-bind="{ ...rootProps, ...$attrs, ...ariaAttrs }"
    :name="name"
    :disabled="rootDisabled"
    :aria-readonly="props.readonly || void 0"
    :orientation="props.orientation"
    :class="ui.root({ class: [props.ui?.root, props.class] })"
    @update:model-value="onUpdate"
  >
    <RatingItem
      v-for="item in items"
      v-slot="{ steps }"
      :key="item"
      :item="item"
      data-slot="item"
      :class="ui.item({ class: props.ui?.item })"
    >
      <!-- Empty icon as background -->
      <slot name="item" :index="item" :filled="false">
        <UIcon
          :name="props.emptyIcon ?? starIcon"
          data-slot="emptyIcon"
          :class="ui.emptyIcon({ class: props.ui?.emptyIcon })"
        />
      </slot>

      <!-- Indicators overlaid for each step, clipped to the rated fraction -->
      <RatingItemIndicator
        v-for="step in steps"
        :key="step"
        :step="step"
        :aria-label="`Rate ${step} out of ${props.length}`"
        data-slot="indicator"
        :class="ui.indicator({ class: props.ui?.indicator })"
      >
        <slot name="item" :index="item" :filled="true">
          <UIcon
            :name="starIcon"
            data-slot="icon"
            :class="ui.icon({ class: props.ui?.icon })"
          />
        </slot>
      </RatingItemIndicator>
    </RatingItem>
  </RatingRoot>
</template>
