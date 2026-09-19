<script>
import theme from "#build/ui/slider";
</script>

<script setup>
import { computed } from "vue";
import { SliderRoot, SliderRange, SliderTrack, SliderThumb } from "reka-ui";
import { useForwardProps } from "../composables/useForwardProps";
import { reactivePick } from "@vueuse/core";
import { useAppConfig } from "#imports";
import { useComponentProps } from "../composables/useComponentProps";
import { useFormField } from "../composables/useFormField";
import { pick, omit } from "../utils";
import { tv } from "../utils/tv";
import UTooltip from "./Tooltip.vue";
const _props = defineProps({
  as: { type: null, required: false },
  size: { type: null, required: false },
  color: { type: null, required: false },
  orientation: { type: null, required: false, default: "horizontal" },
  tooltip: { type: [Boolean, Object], required: false },
  defaultValue: { type: [Number, Array], required: false },
  class: { type: null, required: false },
  ui: { type: Object, required: false },
  name: { type: String, required: false },
  disabled: { type: Boolean, required: false },
  inverted: { type: Boolean, required: false },
  min: { type: Number, required: false, default: 0 },
  max: { type: Number, required: false, default: 100 },
  step: { type: Number, required: false, default: 1 },
  minStepsBetweenThumbs: { type: Number, required: false }
});
const emits = defineEmits(["change"]);
defineOptions({ inheritAttrs: false });
const props = useComponentProps("slider", _props);
const modelValue = defineModel({ type: null });
const appConfig = useAppConfig();
const rootProps = useForwardProps(reactivePick(props, "as", "orientation", "min", "max", "step", "minStepsBetweenThumbs", "inverted"));
const { id, emitFormChange, emitFormInput, size: formFieldSize, color: formFieldColor, name, disabled: formFieldDisabled, ariaAttrs } = useFormField(_props);
const color = computed(() => formFieldColor.value ?? props.color);
const size = computed(() => formFieldSize.value ?? props.size);
const disabled = computed(() => formFieldDisabled.value ?? props.disabled);
const defaultSliderValue = computed(() => {
  if (typeof props.defaultValue === "number") {
    return [props.defaultValue];
  }
  return props.defaultValue;
});
const sliderValue = computed({
  get() {
    if (typeof modelValue.value === "number") {
      return [modelValue.value];
    }
    return modelValue.value ?? defaultSliderValue.value;
  },
  set(value) {
    modelValue.value = value?.length !== 1 ? value : value[0];
  }
});
const thumbs = computed(() => sliderValue.value?.length ?? 1);
const thumbAttrs = ["aria-label", "aria-labelledby", "aria-describedby", "aria-valuetext", "aria-invalid", "aria-errormessage"];
const ui = computed(() => tv({ extend: theme, ...appConfig.ui?.slider || {} })({
  disabled: disabled.value,
  size: size.value,
  color: color.value,
  orientation: props.orientation
}));
function onChange(value) {
  const event = new Event("change", { target: { value } });
  emits("change", event);
  emitFormChange();
}
</script>

<template>
  <SliderRoot
    :id="id"
    v-model="sliderValue"
    data-slot="root"
    :role="thumbs > 1 && ($attrs['aria-label'] || $attrs['aria-labelledby']) ? 'group' : void 0"
    v-bind="{ ...rootProps, ...thumbs > 1 ? $attrs : omit($attrs, thumbAttrs) }"
    :name="name"
    :disabled="disabled"
    :class="ui.root({ class: [props.ui?.root, props.class] })"
    :default-value="defaultSliderValue"
    @update:model-value="emitFormInput()"
    @value-commit="onChange"
  >
    <SliderTrack data-slot="track" :class="ui.track({ class: props.ui?.track })">
      <SliderRange data-slot="range" :class="ui.range({ class: props.ui?.range })" />
    </SliderTrack>

    <template v-for="thumb in thumbs" :key="thumb">
      <UTooltip
        v-if="!!props.tooltip"
        :text="thumbs > 1 ? String(sliderValue?.[thumb - 1]) : String(sliderValue)"
        disable-closing-trigger
        v-bind="typeof props.tooltip === 'object' ? props.tooltip : {}"
      >
        <SliderThumb data-slot="thumb" :class="ui.thumb({ class: props.ui?.thumb })" v-bind="{ ...thumbs === 1 ? pick($attrs, thumbAttrs) : {}, ...ariaAttrs }" :aria-label="thumbs > 1 || $attrs['aria-labelledby'] ? void 0 : $attrs['aria-label'] ?? 'Thumb'" />
      </UTooltip>
      <SliderThumb v-else data-slot="thumb" :class="ui.thumb({ class: props.ui?.thumb })" v-bind="{ ...thumbs === 1 ? pick($attrs, thumbAttrs) : {}, ...ariaAttrs }" :aria-label="thumbs > 1 || $attrs['aria-labelledby'] ? void 0 : $attrs['aria-label'] ?? 'Thumb'" />
    </template>
  </SliderRoot>
</template>
