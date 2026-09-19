<script>
import theme from "#build/ui/progress-group";
</script>

<script setup>
import { computed } from "vue";
import { Primitive, ProgressRoot, ProgressIndicator } from "reka-ui";
import { useAppConfig } from "#imports";
import { useComponentProps } from "../composables/useComponentProps";
import { tv } from "../utils/tv";
import UIcon from "./Icon.vue";
const _props = defineProps({
  as: { type: null, required: false },
  items: { type: Array, required: false },
  max: { type: Number, required: false, default: 100 },
  status: { type: Boolean, required: false },
  size: { type: null, required: false },
  color: { type: null, required: false },
  orientation: { type: null, required: false, default: "horizontal" },
  class: { type: null, required: false },
  ui: { type: Object, required: false }
});
const slots = defineSlots();
const props = useComponentProps("progressGroup", _props);
const appConfig = useAppConfig();
const ui = computed(() => tv({ extend: theme, ...appConfig.ui?.progressGroup || {} })({
  size: props.size,
  color: props.color,
  orientation: props.orientation
}));
const max = computed(() => {
  const value = Number(props.max);
  return Number.isFinite(value) && value > 0 ? value : 100;
});
const values = computed(() => (props.items ?? []).map((item) => Math.min(Math.max(Number(item.value) || 0, 0), max.value)));
const percents = computed(() => values.value.map((value) => value / max.value * 100));
const percent = computed(() => Math.min(100, Math.round(percents.value.reduce((total, value) => total + value, 0))));
const statusStyle = computed(() => ({ "--percent": `${percent.value}%` }));
const themeColors = computed(() => Object.keys({ ...theme.variants?.color, ...appConfig.ui?.progressGroup?.variants?.color }));
const itemColors = computed(() => (props.items ?? []).map((item) => item.color || props.color));
const customColors = computed(() => itemColors.value.map((color) => color && !themeColors.value.includes(color) ? color : void 0));
const hasList = computed(() => !!props.items?.length && (props.items.some((item) => item.label || item.icon || item.slot) || !!slots.item || !!slots["item-leading"] || !!slots["item-label"] || !!slots["item-trailing"]));
function segmentStyle(index) {
  const value = `${percents.value[index] ?? 0}%`;
  return props.orientation === "vertical" ? { height: value } : { width: value };
}
const valueLabels = computed(() => (props.items ?? []).map((item) => {
  const label = item.label;
  return label ? () => label : void 0;
}));
</script>

<template>
  <Primitive :as="props.as" :data-orientation="props.orientation" data-slot="root" :class="ui.root({ class: [props.ui?.root, props.class] })">
    <div v-if="props.status || !!slots.status" data-slot="status" :class="ui.status({ class: props.ui?.status })" :style="statusStyle">
      <slot name="status" :percent="percent">
        {{ percent }}%
      </slot>
    </div>

    <div data-slot="base" :class="ui.base({ class: props.ui?.base })">
      <ProgressRoot
        v-for="(item, index) in props.items"
        :key="index"
        :model-value="values[index]"
        :max="max"
        :get-value-label="valueLabels[index]"
        data-slot="segment"
        :class="ui.segment({ class: [props.ui?.segment, item.ui?.segment] })"
        :style="segmentStyle(index)"
      >
        <ProgressIndicator data-slot="indicator" :class="ui.indicator({ color: itemColors[index], class: [props.ui?.indicator, item.ui?.indicator] })" :style="customColors[index] ? { backgroundColor: customColors[index] } : void 0" />
      </ProgressRoot>
    </div>

    <ul v-if="hasList" data-slot="list" :class="ui.list({ class: props.ui?.list })">
      <li v-for="(item, index) in props.items" :key="index" data-slot="item" :class="ui.item({ class: [props.ui?.item, item.ui?.item, item.class] })">
        <slot :name="item.slot || 'item'" :item="item" :index="index" :percent="percents[index] ?? 0">
          <slot :name="item.slot ? `${item.slot}-leading` : 'item-leading'" :item="item" :index="index" :percent="percents[index] ?? 0">
            <UIcon v-if="item.icon" :name="item.icon" data-slot="itemLeadingIcon" :class="ui.itemLeadingIcon({ color: itemColors[index], class: [props.ui?.itemLeadingIcon, item.ui?.itemLeadingIcon] })" :style="customColors[index] ? { color: customColors[index] } : void 0" />
            <span v-else data-slot="itemLeadingDot" :class="ui.itemLeadingDot({ color: itemColors[index], class: [props.ui?.itemLeadingDot, item.ui?.itemLeadingDot] })" :style="customColors[index] ? { backgroundColor: customColors[index] } : void 0" />
          </slot>

          <span v-if="item.label || !!slots[item.slot ? `${item.slot}-label` : 'item-label']" data-slot="itemLabel" :class="ui.itemLabel({ class: [props.ui?.itemLabel, item.ui?.itemLabel] })">
            <slot :name="item.slot ? `${item.slot}-label` : 'item-label'" :item="item" :index="index" :percent="percents[index] ?? 0">
              {{ item.label }}
            </slot>
          </span>

          <span data-slot="itemTrailing" :class="ui.itemTrailing({ class: [props.ui?.itemTrailing, item.ui?.itemTrailing] })">
            <slot :name="item.slot ? `${item.slot}-trailing` : 'item-trailing'" :item="item" :index="index" :percent="percents[index] ?? 0">
              {{ Math.round(percents[index] ?? 0) }}%
            </slot>
          </span>
        </slot>
      </li>
    </ul>
  </Primitive>
</template>
