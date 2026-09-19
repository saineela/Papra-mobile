<script>
import theme from "#build/ui/splitter";
</script>

<script setup>
import { ref, computed, onBeforeUpdate } from "vue";
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from "reka-ui";
import { reactivePick } from "@vueuse/core";
import { useAppConfig } from "#imports";
import { useComponentProps } from "../composables/useComponentProps";
import { useForwardProps } from "../composables/useForwardProps";
import { tv } from "../utils/tv";
const _props = defineProps({
  as: { type: null, required: false },
  id: { type: String, required: false },
  orientation: { type: null, required: false, default: "horizontal" },
  items: { type: Array, required: false },
  disabled: { type: Boolean, required: false },
  class: { type: null, required: false },
  ui: { type: Object, required: false },
  autoSaveId: { type: [String, null], required: false },
  keyboardResizeBy: { type: [Number, null], required: false },
  storage: { type: Object, required: false },
  hitAreaMargins: { type: Object, required: false }
});
const emits = defineEmits(["layout", "collapse", "expand", "resize", "dragging"]);
defineSlots();
const props = useComponentProps("splitter", _props);
const appConfig = useAppConfig();
const rootProps = useForwardProps(reactivePick(props, "as", "id", "autoSaveId", "keyboardResizeBy", "storage"));
const ui = computed(() => tv({ extend: theme, ...appConfig.ui?.splitter || {} })({
  orientation: props.orientation
}));
const panelsRef = ref([]);
onBeforeUpdate(() => {
  panelsRef.value.length = 0;
});
function getPanelId(item, index) {
  return item.id ?? (props.id ? `${props.id}-panel-${index}` : void 0);
}
function getHandleId(index) {
  return props.id ? `${props.id}-handle-${index}` : void 0;
}
function setPanelRef(index, el) {
  if (el) {
    panelsRef.value[index] = el;
  }
}
defineExpose({
  panelsRef
});
</script>

<template>
  <SplitterGroup v-bind="rootProps" :direction="props.orientation" data-slot="root" :class="ui.root({ class: [props.ui?.root, props.class] })" @layout="emits('layout', $event)">
    <template v-for="(item, index) in props.items" :key="item.id ?? index">
      <SplitterPanel
        :id="getPanelId(item, index)"
        :ref="(el) => setPanelRef(index, el)"
        v-slot="{ isCollapsed, collapse, expand, resize }"
        :default-size="item.defaultSize"
        :min-size="item.minSize"
        :max-size="item.maxSize"
        :collapsible="item.collapsible"
        :collapsed-size="item.collapsedSize"
        :size-unit="item.sizeUnit"
        :order="item.order"
        data-slot="panel"
        :class="ui.panel({ class: [props.ui?.panel, item.ui?.panel, item.class] })"
        @collapse="emits('collapse', index)"
        @expand="emits('expand', index)"
        @resize="(size, prevSize) => emits('resize', index, size, prevSize)"
      >
        <slot
          :name="item.slot || `panel-${index}`"
          :item="item"
          :index="index"
          :collapsed="isCollapsed"
          :collapse="collapse"
          :expand="expand"
          :resize="resize"
          :ui="ui"
        />
      </SplitterPanel>

      <SplitterResizeHandle
        v-if="index < props.items.length - 1"
        :id="getHandleId(index)"
        :disabled="props.disabled"
        :hit-area-margins="props.hitAreaMargins"
        data-slot="handle"
        :class="ui.handle({ class: props.ui?.handle })"
        @dragging="(dragging) => emits('dragging', index, dragging)"
      >
        <slot name="resize-handle" :index="index" :ui="ui" />
      </SplitterResizeHandle>
    </template>
  </SplitterGroup>
</template>
