import { BubbleMenuPlugin } from "@tiptap/extension-bubble-menu";
import { PluginKey } from "@tiptap/pm/state";
import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { FloatingMenuPlugin } from "@tiptap/extension-floating-menu";
//#region src/menus/BubbleMenu.ts
const BubbleMenu = defineComponent({
	name: "BubbleMenu",
	inheritAttrs: false,
	props: {
		pluginKey: {
			type: [String, Object],
			default: void 0
		},
		editor: {
			type: Object,
			required: true
		},
		updateDelay: {
			type: Number,
			default: void 0
		},
		resizeDelay: {
			type: Number,
			default: void 0
		},
		options: {
			type: Object,
			default: () => ({})
		},
		appendTo: {
			type: [Object, Function],
			default: void 0
		},
		shouldShow: {
			type: Function,
			default: null
		},
		getReferencedVirtualElement: {
			type: Function,
			default: void 0
		}
	},
	setup(props, { slots, attrs }) {
		var _props$pluginKey;
		const root = ref(null);
		const resolvedPluginKey = (_props$pluginKey = props.pluginKey) !== null && _props$pluginKey !== void 0 ? _props$pluginKey : new PluginKey("bubbleMenu");
		onMounted(() => {
			const { editor, options, resizeDelay, appendTo, shouldShow, getReferencedVirtualElement, updateDelay } = props;
			const el = root.value;
			if (!el) return;
			el.style.visibility = "hidden";
			el.style.position = "absolute";
			el.remove();
			nextTick(() => {
				editor.registerPlugin(BubbleMenuPlugin({
					editor,
					element: el,
					options,
					pluginKey: resolvedPluginKey,
					resizeDelay,
					appendTo,
					shouldShow,
					getReferencedVirtualElement,
					updateDelay
				}));
			});
		});
		onBeforeUnmount(() => {
			const { editor } = props;
			editor.unregisterPlugin(resolvedPluginKey);
		});
		return () => {
			var _slots$default;
			return h("div", {
				ref: root,
				...attrs
			}, (_slots$default = slots.default) === null || _slots$default === void 0 ? void 0 : _slots$default.call(slots));
		};
	}
});
//#endregion
//#region src/menus/FloatingMenu.ts
const FloatingMenu = defineComponent({
	name: "FloatingMenu",
	inheritAttrs: false,
	props: {
		pluginKey: {
			type: null,
			default: void 0
		},
		editor: {
			type: Object,
			required: true
		},
		updateDelay: {
			type: Number,
			default: void 0
		},
		resizeDelay: {
			type: Number,
			default: void 0
		},
		options: {
			type: Object,
			default: () => ({})
		},
		appendTo: {
			type: [Object, Function],
			default: void 0
		},
		shouldShow: {
			type: Function,
			default: null
		}
	},
	setup(props, { slots, attrs }) {
		var _props$pluginKey;
		const root = ref(null);
		const resolvedPluginKey = (_props$pluginKey = props.pluginKey) !== null && _props$pluginKey !== void 0 ? _props$pluginKey : new PluginKey("floatingMenu");
		onMounted(() => {
			const { editor, updateDelay, resizeDelay, options, appendTo, shouldShow } = props;
			const el = root.value;
			if (!el) return;
			el.style.visibility = "hidden";
			el.style.position = "absolute";
			el.remove();
			editor.registerPlugin(FloatingMenuPlugin({
				pluginKey: resolvedPluginKey,
				editor,
				element: el,
				updateDelay,
				resizeDelay,
				options,
				appendTo,
				shouldShow
			}));
		});
		onBeforeUnmount(() => {
			const { editor } = props;
			editor.unregisterPlugin(resolvedPluginKey);
		});
		return () => {
			var _slots$default;
			return h("div", {
				ref: root,
				...attrs
			}, (_slots$default = slots.default) === null || _slots$default === void 0 ? void 0 : _slots$default.call(slots));
		};
	}
});
//#endregion
export { BubbleMenu, FloatingMenu };

//# sourceMappingURL=index.js.map