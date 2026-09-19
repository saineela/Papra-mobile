Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
let _tiptap_extension_drag_handle = require("@tiptap/extension-drag-handle");
let vue = require("vue");
//#region src/DragHandle.ts
const DragHandle = (0, vue.defineComponent)({
	name: "DragHandleVue",
	props: {
		pluginKey: {
			type: [String, Object],
			default: _tiptap_extension_drag_handle.dragHandlePluginDefaultKey
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
		const root = (0, vue.ref)(null);
		const pluginHandle = (0, vue.shallowRef)(null);
		const initPlugin = () => {
			const { editor, pluginKey, onNodeChange, onElementDragEnd, onElementDragStart, computePositionConfig, nested } = props;
			if (!root.value) return;
			if (!props.editor || props.editor.isDestroyed) return;
			root.value.style.visibility = "hidden";
			const nestedOptions = (0, _tiptap_extension_drag_handle.normalizeNestedOptions)(nested);
			const init = (0, _tiptap_extension_drag_handle.DragHandlePlugin)({
				editor,
				element: root.value,
				pluginKey,
				computePositionConfig: {
					..._tiptap_extension_drag_handle.defaultComputePositionConfig,
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
		(0, vue.onMounted)(async () => {
			await (0, vue.nextTick)();
			initPlugin();
		});
		(0, vue.watch)(() => props.nested, () => {
			destroyPlugin();
			initPlugin();
		}, { deep: true });
		(0, vue.onBeforeUnmount)(() => {
			destroyPlugin();
		});
		return () => {
			var _slots$default;
			return (0, vue.h)("div", {
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
exports.DragHandle = DragHandle;
exports.default = src_default;

//# sourceMappingURL=index.cjs.map