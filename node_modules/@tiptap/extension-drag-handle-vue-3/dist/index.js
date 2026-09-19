import { DragHandlePlugin, defaultComputePositionConfig, dragHandlePluginDefaultKey, normalizeNestedOptions } from "@tiptap/extension-drag-handle";
import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
//#region src/DragHandle.ts
const DragHandle = defineComponent({
	name: "DragHandleVue",
	props: {
		pluginKey: {
			type: [String, Object],
			default: dragHandlePluginDefaultKey
		},
		editor: {
			type: Object,
			required: true
		},
		computePositionConfig: {
			type: Object,
			default: () => ({})
		},
		onNodeChange: {
			type: Function,
			default: null
		},
		onElementDragStart: {
			type: Function,
			default: null
		},
		onElementDragEnd: {
			type: Function,
			default: null
		},
		class: {
			type: String,
			default: "drag-handle"
		},
		nested: {
			type: [Boolean, Object],
			default: false
		}
	},
	setup(props, { slots }) {
		const root = ref(null);
		const pluginHandle = shallowRef(null);
		const initPlugin = () => {
			const { editor, pluginKey, onNodeChange, onElementDragEnd, onElementDragStart, computePositionConfig, nested } = props;
			if (!root.value) return;
			if (!props.editor || props.editor.isDestroyed) return;
			root.value.style.visibility = "hidden";
			const nestedOptions = normalizeNestedOptions(nested);
			const init = DragHandlePlugin({
				editor,
				element: root.value,
				pluginKey,
				computePositionConfig: {
					...defaultComputePositionConfig,
					...computePositionConfig
				},
				onNodeChange,
				onElementDragStart,
				onElementDragEnd,
				nestedOptions
			});
			pluginHandle.value = init;
			props.editor.registerPlugin(init.plugin);
		};
		const destroyPlugin = () => {
			var _pluginHandle$value$u, _pluginHandle$value;
			if (!pluginHandle.value) return;
			if (props.editor && !props.editor.isDestroyed) props.editor.unregisterPlugin(props.pluginKey);
			(_pluginHandle$value$u = (_pluginHandle$value = pluginHandle.value).unbind) === null || _pluginHandle$value$u === void 0 || _pluginHandle$value$u.call(_pluginHandle$value);
			pluginHandle.value = null;
		};
		onMounted(async () => {
			await nextTick();
			initPlugin();
		});
		watch(() => props.nested, () => {
			destroyPlugin();
			initPlugin();
		}, { deep: true });
		onBeforeUnmount(() => {
			destroyPlugin();
		});
		return () => {
			var _slots$default;
			return h("div", {
				ref: root,
				class: props.class,
				style: { position: "absolute" },
				"data-dragging": "false"
			}, (_slots$default = slots.default) === null || _slots$default === void 0 ? void 0 : _slots$default.call(slots));
		};
	}
});
//#endregion
//#region src/index.ts
var src_default = DragHandle;
//#endregion
export { DragHandle, src_default as default };

//# sourceMappingURL=index.js.map