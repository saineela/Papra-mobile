Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _tiptap_extension_bubble_menu = require("@tiptap/extension-bubble-menu");
let _tiptap_pm_state = require("@tiptap/pm/state");
let vue = require("vue");
let _tiptap_extension_floating_menu = require("@tiptap/extension-floating-menu");
//#region src/menus/BubbleMenu.ts
const BubbleMenu = (0, vue.defineComponent)({
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
		const root = (0, vue.ref)(null);
		const resolvedPluginKey = (_props$pluginKey = props.pluginKey) !== null && _props$pluginKey !== void 0 ? _props$pluginKey : new _tiptap_pm_state.PluginKey("bubbleMenu");
		(0, vue.onMounted)(() => {
			const { editor, options, resizeDelay, appendTo, shouldShow, getReferencedVirtualElement, updateDelay } = props;
			const el = root.value;
			if (!el) return;
			el.style.visibility = "hidden";
			el.style.position = "absolute";
			el.remove();
			(0, vue.nextTick)(() => {
				editor.registerPlugin((0, _tiptap_extension_bubble_menu.BubbleMenuPlugin)({
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
		(0, vue.onBeforeUnmount)(() => {
			const { editor } = props;
			editor.unregisterPlugin(resolvedPluginKey);
		});
		return () => {
			var _slots$default;
			return (0, vue.h)("div", {
				ref: root,
				...attrs
			}, (_slots$default = slots.default) === null || _slots$default === void 0 ? void 0 : _slots$default.call(slots));
		};
	}
});
//#endregion
//#region src/menus/FloatingMenu.ts
const FloatingMenu = (0, vue.defineComponent)({
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
		const root = (0, vue.ref)(null);
		const resolvedPluginKey = (_props$pluginKey = props.pluginKey) !== null && _props$pluginKey !== void 0 ? _props$pluginKey : new _tiptap_pm_state.PluginKey("floatingMenu");
		(0, vue.onMounted)(() => {
			const { editor, updateDelay, resizeDelay, options, appendTo, shouldShow } = props;
			const el = root.value;
			if (!el) return;
			el.style.visibility = "hidden";
			el.style.position = "absolute";
			el.remove();
			editor.registerPlugin((0, _tiptap_extension_floating_menu.FloatingMenuPlugin)({
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
		(0, vue.onBeforeUnmount)(() => {
			const { editor } = props;
			editor.unregisterPlugin(resolvedPluginKey);
		});
		return () => {
			var _slots$default;
			return (0, vue.h)("div", {
				ref: root,
				...attrs
			}, (_slots$default = slots.default) === null || _slots$default === void 0 ? void 0 : _slots$default.call(slots));
		};
	}
});
//#endregion
exports.BubbleMenu = BubbleMenu;
exports.FloatingMenu = FloatingMenu;

//# sourceMappingURL=index.cjs.map