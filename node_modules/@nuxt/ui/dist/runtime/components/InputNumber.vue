<script>
import theme from "#build/ui/input-number";
</script>

<script setup>
import { onMounted, onScopeDispose, computed, useTemplateRef, toRef } from "vue";
import { NumberFieldRoot, NumberFieldInput, NumberFieldDecrement, NumberFieldIncrement } from "reka-ui";
import { useForwardProps } from "../composables/useForwardProps";
import { reactivePick } from "@vueuse/core";
import { useAppConfig } from "#imports";
import { useComponentProps } from "../composables/useComponentProps";
import { useFieldGroup } from "../composables/useFieldGroup";
import { useFormField } from "../composables/useFormField";
import { useLocale } from "../composables/useLocale";
import { tv } from "../utils/tv";
import UButton from "./Button.vue";
defineOptions({ inheritAttrs: false });
const _props = defineProps({
  as: { type: null, required: false },
  placeholder: { type: String, required: false },
  color: { type: null, required: false },
  variant: { type: null, required: false },
  size: { type: null, required: false },
  highlight: { type: Boolean, required: false },
  fixed: { type: Boolean, required: false },
  orientation: { type: null, required: false, default: "horizontal" },
  increment: { type: [Boolean, Object], required: false, default: true },
  incrementIcon: { type: null, required: false },
  incrementDisabled: { type: Boolean, required: false },
  decrement: { type: [Boolean, Object], required: false, default: true },
  decrementIcon: { type: null, required: false },
  decrementDisabled: { type: Boolean, required: false },
  autofocus: { type: Boolean, required: false },
  autofocusDelay: { type: Number, required: false },
  defaultValue: { type: null, required: false },
  modelValue: { type: null, required: false },
  modelModifiers: { type: null, required: false },
  class: { type: null, required: false },
  ui: { type: Object, required: false },
  min: { type: Number, required: false },
  max: { type: Number, required: false },
  step: { type: Number, required: false },
  stepSnapping: { type: Boolean, required: false },
  disabled: { type: Boolean, required: false },
  required: { type: Boolean, required: false },
  id: { type: String, required: false },
  name: { type: String, required: false },
  formatOptions: { type: null, required: false },
  disableWheelChange: { type: Boolean, required: false },
  invertWheelChange: { type: Boolean, required: false },
  readonly: { type: Boolean, required: false },
  focusOnChange: { type: Boolean, required: false },
  locale: { type: String, required: false }
});
const emits = defineEmits(["update:modelValue", "blur", "change"]);
defineSlots();
const props = useComponentProps("inputNumber", _props);
const { t } = useLocale();
const appConfig = useAppConfig();
const rootProps = useForwardProps(reactivePick(props, "as", "stepSnapping", "formatOptions", "disableWheelChange", "invertWheelChange", "required", "readonly", "focusOnChange", "locale"));
const { emitFormBlur, emitFormFocus, emitFormChange, emitFormInput, id, color: formFieldColor, size: formFieldSize, name, highlight: formFieldHighlight, disabled: formFieldDisabled, ariaAttrs } = useFormField(_props);
const { orientation, size: fieldGroupSize } = useFieldGroup(_props);
const color = computed(() => formFieldColor.value ?? props.color);
const highlight = computed(() => formFieldHighlight.value ?? props.highlight);
const size = computed(() => fieldGroupSize.value ?? formFieldSize.value ?? props.size);
const disabled = computed(() => formFieldDisabled.value ?? props.disabled);
const ui = computed(() => tv({ extend: theme, ...appConfig.ui?.inputNumber || {} })({
  color: color.value,
  variant: props.variant,
  size: size.value,
  highlight: highlight.value,
  fixed: props.fixed,
  orientation: props.orientation,
  fieldGroup: orientation.value,
  increment: props.orientation === "vertical" ? !!props.increment || !!props.decrement : !!props.increment,
  decrement: props.orientation === "vertical" ? false : !!props.decrement
}));
const incrementIcon = computed(() => props.incrementIcon || (props.orientation === "horizontal" ? appConfig.ui.icons.plus : appConfig.ui.icons.chevronUp));
const decrementIcon = computed(() => props.decrementIcon || (props.orientation === "horizontal" ? appConfig.ui.icons.minus : appConfig.ui.icons.chevronDown));
const inputRef = useTemplateRef("inputRef");
function onUpdate(value) {
  if (props.modelModifiers?.optional) {
    value = value ?? void 0;
  }
  if (value === props.modelValue || value == null && props.modelValue == null) {
    return;
  }
  emits("update:modelValue", value);
  const event = new Event("change", { target: { value } });
  emits("change", event);
  emitFormChange();
  emitFormInput();
}
function onBlur(event) {
  emitFormBlur();
  emits("blur", event);
}
function autoFocus() {
  if (props.autofocus) {
    inputRef.value?.$el?.focus();
  }
}
let autofocusTimeoutId;
onMounted(() => {
  autofocusTimeoutId = setTimeout(() => {
    autoFocus();
  }, props.autofocusDelay);
});
onScopeDispose(() => clearTimeout(autofocusTimeoutId));
defineExpose({
  inputRef: toRef(() => inputRef.value?.$el)
});
</script>

<template>
  <NumberFieldRoot
    v-bind="rootProps"
    :id="id"
    :default-value="props.defaultValue"
    :model-value="props.modelValue"
    :min="props.min"
    :max="props.max"
    :step="props.step"
    :data-slot="$attrs['data-slot'] ?? 'root'"
    :class="ui.root({ class: [props.ui?.root, props.class] })"
    :name="name"
    :disabled="disabled"
    @update:model-value="(val) => onUpdate(val)"
  >
    <NumberFieldInput
      v-bind="{ ...$attrs, ...ariaAttrs }"
      ref="inputRef"
      :placeholder="props.placeholder"
      :required="props.required"
      data-slot="base"
      :class="ui.base({ class: props.ui?.base })"
      @blur="onBlur"
      @focus="emitFormFocus"
    />

    <div v-if="!!props.increment" data-slot="increment" :class="ui.increment({ class: props.ui?.increment })">
      <NumberFieldIncrement as-child :disabled="disabled || props.incrementDisabled">
        <slot name="increment">
          <UButton
            :icon="incrementIcon"
            :color="color"
            :size="size"
            variant="link"
            :aria-label="t('inputNumber.increment')"
            v-bind="typeof props.increment === 'object' ? props.increment : void 0"
          />
        </slot>
      </NumberFieldIncrement>
    </div>

    <div v-if="!!props.decrement" data-slot="decrement" :class="ui.decrement({ class: props.ui?.decrement })">
      <NumberFieldDecrement as-child :disabled="disabled || props.decrementDisabled">
        <slot name="decrement">
          <UButton
            :icon="decrementIcon"
            :color="color"
            :size="size"
            variant="link"
            :aria-label="t('inputNumber.decrement')"
            v-bind="typeof props.decrement === 'object' ? props.decrement : void 0"
          />
        </slot>
      </NumberFieldDecrement>
    </div>
  </NumberFieldRoot>
</template>
