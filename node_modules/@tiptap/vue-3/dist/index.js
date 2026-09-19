import { Editor as Editor$1, MarkView, NodeView, createWidgetDecoration, isNodeViewSelected } from "@tiptap/core";
import { camelize, customRef, defineComponent, getCurrentInstance, h, markRaw, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, render, shallowRef, toRaw, unref, watchEffect } from "vue";
export * from "@tiptap/core";
//#region src/Editor.ts
function useDebouncedRef(value) {
	return customRef((track, trigger) => {
		return {
			get() {
				track();
				return value;
			},
			set(newValue) {
				value = newValue;
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						trigger();
					});
				});
			}
		};
	});
}
var Editor = class extends Editor$1 {
	constructor(options = {}) {
		super(options);
		this.contentComponent = null;
		this.appContext = null;
		this.reactiveState = useDebouncedRef(this.view.state);
		this.reactiveExtensionStorage = useDebouncedRef(this.extensionStorage);
		this.on("beforeTransaction", ({ nextState }) => {
			this.reactiveState.value = nextState;
			this.reactiveExtensionStorage.value = this.extensionStorage;
		});
		return markRaw(this);
	}
	get state() {
		return this.reactiveState ? this.reactiveState.value : this.view.state;
	}
	get storage() {
		return this.reactiveExtensionStorage ? this.reactiveExtensionStorage.value : super.storage;
	}
	/**
	* Register a ProseMirror plugin.
	*/
	registerPlugin(plugin, handlePlugins) {
		const nextState = super.registerPlugin(plugin, handlePlugins);
		if (this.reactiveState) this.reactiveState.value = nextState;
		return nextState;
	}
	/**
	* Unregister a ProseMirror plugin.
	*/
	unregisterPlugin(nameOrPluginKey) {
		const nextState = super.unregisterPlugin(nameOrPluginKey);
		if (this.reactiveState && nextState) this.reactiveState.value = nextState;
		return nextState;
	}
};
//#endregion
//#region src/EditorContent.ts
const EditorContent = defineComponent({
	name: "EditorContent",
	props: { editor: {
		default: null,
		type: Object
	} },
	setup(props) {
		const rootEl = ref();
		const instance = getCurrentInstance();
		watchEffect(() => {
			const editor = props.editor;
			if (editor && editor.options.element && rootEl.value) nextTick(() => {
				var _editor$view$dom;
				if (!rootEl.value || !((_editor$view$dom = editor.view.dom) === null || _editor$view$dom === void 0 ? void 0 : _editor$view$dom.parentNode)) return;
				const element = unref(rootEl.value);
				rootEl.value.append(...editor.view.dom.parentNode.childNodes);
				editor.contentComponent = instance.ctx._;
				if (instance) editor.appContext = {
					...instance.appContext,
					provides: instance.provides
				};
				editor.setOptions({ element });
				editor.createNodeViews();
			});
		});
		onBeforeUnmount(() => {
			const editor = props.editor;
			if (!editor) return;
			editor.contentComponent = null;
			editor.appContext = null;
		});
		return { rootEl };
	},
	render() {
		return h("div", { ref: (el) => {
			this.rootEl = el;
		} });
	}
});
//#endregion
//#region src/NodeViewContent.ts
const NodeViewContent = defineComponent({
	name: "NodeViewContent",
	props: { as: {
		type: String,
		default: "div"
	} },
	inject: { nodeViewContentRef: { default: void 0 } },
	mounted() {
		const ref = this.nodeViewContentRef;
		if (ref && this.$el) ref(this.$el);
	},
	beforeUnmount() {
		const ref = this.nodeViewContentRef;
		if (ref) ref(null);
	},
	render() {
		return h(this.as, {
			style: { whiteSpace: "pre-wrap" },
			"data-node-view-content": ""
		});
	}
});
//#endregion
//#region src/NodeViewWrapper.ts
const NodeViewWrapper = defineComponent({
	name: "NodeViewWrapper",
	props: { as: {
		type: String,
		default: "div"
	} },
	inject: ["onDragStart", "decorationClasses"],
	render() {
		var _this$$slots$default, _this$$slots;
		return h(this.as, {
			class: this.decorationClasses,
			style: { whiteSpace: "normal" },
			"data-node-view-wrapper": "",
			onDragstart: this.onDragStart
		}, (_this$$slots$default = (_this$$slots = this.$slots).default) === null || _this$$slots$default === void 0 ? void 0 : _this$$slots$default.call(_this$$slots));
	}
});
//#endregion
//#region src/useEditor.ts
const useEditor = (options = {}) => {
	const editor = shallowRef();
	onMounted(() => {
		editor.value = new Editor(options);
	});
	onBeforeUnmount(() => {
		var _editor$value;
		(_editor$value = editor.value) === null || _editor$value === void 0 || _editor$value.destroy();
	});
	return editor;
};
//#endregion
//#region src/VueRenderer.ts
/**
* This class is used to render Vue components inside the editor.
*/
var VueRenderer = class {
	constructor(component, { props = {}, editor }) {
		this.destroyed = false;
		this.editor = editor;
		this.component = markRaw(component);
		this.el = document.createElement("div");
		this.props = reactive(props);
		this.renderedComponent = this.renderComponent();
	}
	get element() {
		return this.renderedComponent.el;
	}
	get ref() {
		var _this$renderedCompone, _this$renderedCompone2;
		if ((_this$renderedCompone = this.renderedComponent.vNode) === null || _this$renderedCompone === void 0 || (_this$renderedCompone = _this$renderedCompone.component) === null || _this$renderedCompone === void 0 ? void 0 : _this$renderedCompone.exposed) return this.renderedComponent.vNode.component.exposed;
		return (_this$renderedCompone2 = this.renderedComponent.vNode) === null || _this$renderedCompone2 === void 0 || (_this$renderedCompone2 = _this$renderedCompone2.component) === null || _this$renderedCompone2 === void 0 ? void 0 : _this$renderedCompone2.proxy;
	}
	renderComponent() {
		if (this.destroyed) return this.renderedComponent;
		let vNode = h(this.component, this.props);
		if (this.editor.appContext) vNode.appContext = this.editor.appContext;
		if (typeof document !== "undefined" && this.el) render(vNode, this.el);
		const destroy = () => {
			if (this.el) render(null, this.el);
			this.el = null;
			vNode = null;
		};
		return {
			vNode,
			destroy,
			el: this.el ? this.el.firstElementChild : null
		};
	}
	updateProps(props = {}) {
		if (this.destroyed) return;
		Object.entries(props).forEach(([key, value]) => {
			this.props[key] = value;
		});
		this.renderComponent();
	}
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.renderedComponent.destroy();
	}
};
//#endregion
//#region src/VueMarkViewRenderer.ts
const markViewProps = {
	editor: {
		type: Object,
		required: true
	},
	mark: {
		type: Object,
		required: true
	},
	extension: {
		type: Object,
		required: true
	},
	inline: {
		type: Boolean,
		required: true
	},
	view: {
		type: Object,
		required: true
	},
	updateAttributes: {
		type: Function,
		required: true
	},
	HTMLAttributes: {
		type: Object,
		required: true
	}
};
const MarkViewContent = defineComponent({
	name: "MarkViewContent",
	props: { as: {
		type: String,
		default: "span"
	} },
	render() {
		return h(this.as, {
			style: { whiteSpace: "inherit" },
			"data-mark-view-content": ""
		});
	}
});
var VueMarkView = class extends MarkView {
	constructor(component, props, options) {
		super(component, props, options);
		const componentProps = {
			...props,
			updateAttributes: this.updateAttributes.bind(this)
		};
		const extendedComponent = defineComponent({
			extends: { ...component },
			props: Object.keys(componentProps),
			template: this.component.template,
			setup: (reactiveProps) => {
				var _setup;
				return (_setup = component.setup) === null || _setup === void 0 ? void 0 : _setup.call(component, reactiveProps, { expose: () => void 0 });
			},
			__scopeId: component.__scopeId,
			__cssModules: component.__cssModules,
			__name: component.__name,
			__file: component.__file
		});
		this.renderer = new VueRenderer(extendedComponent, {
			editor: this.editor,
			props: componentProps
		});
	}
	get dom() {
		return this.renderer.element;
	}
	get contentDOM() {
		return this.dom.querySelector("[data-mark-view-content]");
	}
	updateAttributes(attrs) {
		const unproxiedMark = toRaw(this.mark);
		super.updateAttributes(attrs, unproxiedMark);
	}
	destroy() {
		this.renderer.destroy();
	}
};
function VueMarkViewRenderer(component, options = {}) {
	return (props) => {
		if (!props.editor.contentComponent) return {};
		return new VueMarkView(component, props, options);
	};
}
//#endregion
//#region src/VueNodeViewRenderer.ts
const nodeViewProps = {
	editor: {
		type: Object,
		required: true
	},
	node: {
		type: Object,
		required: true
	},
	decorations: {
		type: Object,
		required: true
	},
	selected: {
		type: Boolean,
		required: true
	},
	extension: {
		type: Object,
		required: true
	},
	getPos: {
		type: Function,
		required: true
	},
	updateAttributes: {
		type: Function,
		required: true
	},
	deleteNode: {
		type: Function,
		required: true
	},
	view: {
		type: Object,
		required: true
	},
	innerDecorations: {
		type: Object,
		required: true
	},
	HTMLAttributes: {
		type: Object,
		required: true
	}
};
var VueNodeView = class extends NodeView {
	constructor(component, props, options) {
		super(component, props, options);
		this.cachedExtensionWithSyncedStorage = null;
		this.handlePositionUpdate = () => {
			const newPos = this.getPos();
			if (typeof newPos !== "number" || newPos === this.currentPos) return;
			this.currentPos = newPos;
			this.renderer.updateProps({ getPos: () => this.getPos() });
		};
		if (this.options.trackNodeViewPosition) this.editor.on("update", this.handlePositionUpdate);
	}
	/**
	* Returns a proxy of the extension that redirects storage access to the editor's mutable storage.
	* This preserves the original prototype chain (instanceof checks, methods like configure/extend work).
	* Cached to avoid proxy creation on every update.
	*/
	get extensionWithSyncedStorage() {
		if (!this.cachedExtensionWithSyncedStorage) {
			const editor = this.editor;
			const extension = this.extension;
			this.cachedExtensionWithSyncedStorage = new Proxy(extension, { get(target, prop, receiver) {
				if (prop === "storage") {
					var _editor$storage;
					return (_editor$storage = editor.storage[extension.name]) !== null && _editor$storage !== void 0 ? _editor$storage : {};
				}
				return Reflect.get(target, prop, receiver);
			} });
		}
		return this.cachedExtensionWithSyncedStorage;
	}
	mount() {
		const props = {
			editor: this.editor,
			node: this.node,
			decorations: this.decorations,
			innerDecorations: this.innerDecorations,
			view: this.view,
			selected: false,
			extension: this.extensionWithSyncedStorage,
			HTMLAttributes: this.HTMLAttributes,
			getPos: () => this.getPos(),
			updateAttributes: (attributes = {}) => this.updateAttributes(attributes),
			deleteNode: () => this.deleteNode()
		};
		const mountProps = props;
		const onDragStart = this.onDragStart.bind(this);
		this.decorationClasses = ref(this.getDecorationClasses());
		const extendedComponent = defineComponent({
			extends: { ...this.component },
			props: Object.keys(props),
			template: this.component.template,
			setup: (reactiveProps) => {
				var _setup, _ref;
				provide("onDragStart", onDragStart);
				provide("decorationClasses", this.decorationClasses);
				provide("nodeViewContentRef", (el) => {
					if (!el || el === this.contentDOMElement) return;
					if (this.contentDOMElement) while (this.contentDOMElement.firstChild) el.appendChild(this.contentDOMElement.firstChild);
					this.contentDOMElement = el;
				});
				return (_setup = (_ref = this.component).setup) === null || _setup === void 0 ? void 0 : _setup.call(_ref, reactiveProps, { expose: () => void 0 });
			},
			__scopeId: this.component.__scopeId,
			__cssModules: this.component.__cssModules,
			__name: this.component.__name,
			__file: this.component.__file
		});
		this.handleSelectionUpdate = this.handleSelectionUpdate.bind(this);
		this.editor.on("selectionUpdate", this.handleSelectionUpdate);
		this.currentPos = this.getPos();
		if (!this.node.isLeaf) {
			if (this.options.contentDOMElementTag) this.contentDOMElement = document.createElement(this.options.contentDOMElementTag);
			else this.contentDOMElement = document.createElement(this.node.isInline ? "span" : "div");
			this.contentDOMElement.style.whiteSpace = "inherit";
			this.contentDOMElement.dataset.nodeViewContentVue = "";
		}
		this.renderer = new VueRenderer(extendedComponent, {
			editor: this.editor,
			props: mountProps
		});
	}
	/**
	* Return the DOM element.
	* This is the element that will be used to display the node view.
	*/
	get dom() {
		if (!this.renderer.element || !this.renderer.element.hasAttribute("data-node-view-wrapper")) throw Error("Please use the NodeViewWrapper component for your node view.");
		return this.renderer.element;
	}
	/**
	* Return the content DOM element.
	* This is the element that will be used to display the rich-text content of the node.
	*/
	get contentDOM() {
		if (this.node.isLeaf) return null;
		return this.contentDOMElement;
	}
	/**
	* On editor selection update, check if the node is selected.
	* If it is, call `selectNode`, otherwise call `deselectNode`.
	*/
	handleSelectionUpdate() {
		const pos = this.getPos();
		if (typeof pos !== "number") return;
		if (isNodeViewSelected({
			selection: this.editor.state.selection,
			pos,
			nodeSize: this.node.nodeSize,
			selectedOnTextSelection: this.options.selectedOnTextSelection
		})) {
			if (this.renderer.props.selected) return;
			this.selectNode();
		} else {
			if (!this.renderer.props.selected) return;
			this.deselectNode();
		}
	}
	/**
	* On update, update the React component.
	* To prevent unnecessary updates, the `update` option can be used.
	*/
	update(node, decorations, innerDecorations) {
		const rerenderComponent = (props) => {
			this.decorationClasses.value = this.getDecorationClasses();
			this.renderer.updateProps(props);
		};
		if (typeof this.options.update === "function") {
			const oldNode = this.node;
			const oldDecorations = this.decorations;
			const oldInnerDecorations = this.innerDecorations;
			this.node = node;
			this.decorations = decorations;
			this.innerDecorations = innerDecorations;
			return this.options.update({
				oldNode,
				oldDecorations,
				newNode: node,
				newDecorations: decorations,
				oldInnerDecorations,
				innerDecorations,
				updateProps: () => rerenderComponent({
					node,
					decorations,
					innerDecorations,
					extension: this.extensionWithSyncedStorage
				})
			});
		}
		if (node.type !== this.node.type) return false;
		if (!(node !== this.node)) {
			this.node = node;
			this.decorations = decorations;
			this.innerDecorations = innerDecorations;
			this.decorationClasses.value = this.getDecorationClasses();
			return true;
		}
		this.node = node;
		this.decorations = decorations;
		this.innerDecorations = innerDecorations;
		this.currentPos = this.getPos();
		const extraProps = {
			node,
			decorations,
			innerDecorations,
			extension: this.extensionWithSyncedStorage
		};
		if (this.options.trackNodeViewPosition) extraProps.getPos = () => this.getPos();
		rerenderComponent(extraProps);
		return true;
	}
	/**
	* Select the node.
	* Add the `selected` prop and the `ProseMirror-selectednode` class.
	*/
	selectNode() {
		this.renderer.updateProps({ selected: true });
		if (this.renderer.element) this.renderer.element.classList.add("ProseMirror-selectednode");
	}
	/**
	* Deselect the node.
	* Remove the `selected` prop and the `ProseMirror-selectednode` class.
	*/
	deselectNode() {
		this.renderer.updateProps({ selected: false });
		if (this.renderer.element) this.renderer.element.classList.remove("ProseMirror-selectednode");
	}
	getDecorationClasses() {
		return this.decorations.flatMap((item) => item.type.attrs.class).join(" ");
	}
	destroy() {
		this.renderer.destroy();
		this.editor.off("selectionUpdate", this.handleSelectionUpdate);
		if (this.options.trackNodeViewPosition) this.editor.off("update", this.handlePositionUpdate);
		this.contentDOMElement = null;
	}
};
function VueNodeViewRenderer(component, options) {
	return (props) => {
		if (!props.editor.contentComponent) return {};
		return new VueNodeView(typeof component === "function" && "__vccOpts" in component ? component.__vccOpts : component, props, options);
	};
}
//#endregion
//#region src/utils/undeclaredWidgetProps.ts
function collectPropNames(component, names) {
	var _options$mixins;
	const options = component;
	if (!options) return;
	(_options$mixins = options.mixins) === null || _options$mixins === void 0 || _options$mixins.forEach((mixin) => collectPropNames(mixin, names));
	collectPropNames(options.extends, names);
	const { props } = options;
	if (Array.isArray(props)) props.forEach((name) => names.add(camelize(name)));
	else if (props) Object.keys(props).forEach((name) => names.add(camelize(name)));
}
/**
* Builds prop declarations for the widget props a component does not declare itself.
* Declaring them keeps Vue from rendering them as DOM attributes, while leaving
* the component's own `type`, `default` and `validator` options untouched.
*
* @param component The widget component, including its `extends` and `mixins` chain.
* @param props The props passed through `VueWidgetRenderer`.
* @returns A Vue props object for the undeclared keys only.
* @example
* undeclaredWidgetProps(MyWidget, { label: 'a' }) // => { editor: null, getPos: null }
*/
function undeclaredWidgetProps(component, props) {
	const declared = /* @__PURE__ */ new Set();
	collectPropNames(component, declared);
	const declarations = {};
	for (const name of [
		"editor",
		"getPos",
		...Object.keys(props)
	]) if (!declared.has(camelize(name))) declarations[name] = null;
	return declarations;
}
//#endregion
//#region src/utils/wrapFunctionalWidget.ts
/** Keeps an array declaration an array, so Vue does not read numeric keys as prop names. */
function mergePropsOption(declared, undeclared) {
	if (Array.isArray(declared)) return [...declared, ...Object.keys(undeclared)];
	return {
		...declared,
		...undeclared
	};
}
/**
* Wraps a functional component so it can be used as a widget decoration.
*
* A functional component is its own render function, so the options wrapper
* used for object components would spread it away and leave Vue with nothing
* to render.
*
* @param component The functional component.
* @param props The props passed through `VueWidgetRenderer`.
* @returns A functional component declaring the widget props.
* @example
* wrapFunctionalWidget(props => h('span', props.label), { label: 'a' })
*/
function wrapFunctionalWidget(component, props) {
	var _component$displayNam;
	const wrapped = (componentProps, context) => component(componentProps, context);
	wrapped.props = mergePropsOption(component.props, undeclaredWidgetProps(component, props));
	wrapped.emits = component.emits;
	wrapped.inheritAttrs = component.inheritAttrs;
	wrapped.displayName = (_component$displayNam = component.displayName) !== null && _component$displayNam !== void 0 ? _component$displayNam : component.name;
	return wrapped;
}
//#endregion
//#region src/VueWidgetRenderer.ts
const WIDGET_CACHE = Symbol("tiptapVueWidgetCache");
/**
* Renders a Vue component into a ProseMirror widget decoration.
* Reuses Tiptap's `VueRenderer` so the component shares the editor's app
* context (provide/inject works as usual). Use a stable `key` for stateful
* widgets. The component must render a single root element.
* @example
* addDecorations() {
*   return {
*     create: ({ editor, state }) =>
*       findMatches(state.doc).map(match =>
*         VueWidgetRenderer(MyWidget, {
*           editor, pos: match.pos, key: `match-${match.id}`,
*           props: { label: match.label },
*         }),
*       ),
*   }
* }
*/
function VueWidgetRenderer(component, options) {
	const { editor, props = {} } = options;
	const wrappedComponent = isFunctionalComponent(component) ? wrapFunctionalWidget(component, props) : buildOptionsWidget(component, props);
	return createWidgetDecoration({
		...options,
		props,
		cacheKey: WIDGET_CACHE,
		context: (getPos) => ({
			editor: markRaw(editor),
			getPos
		}),
		create: (renderProps) => new VueRenderer(wrappedComponent, {
			editor,
			props: renderProps
		}),
		materialize: (renderer) => renderer.element
	});
}
function isFunctionalComponent(component) {
	return typeof component === "function";
}
/**
* Wraps an object component so the widget props are declared on it. Everything
* Vue reads off the original options has to be carried over by hand, because
* `extends` alone does not apply to `template`, `setup` or the compiler keys.
*/
function buildOptionsWidget(component, props) {
	return defineComponent({
		extends: { ...component },
		props: undeclaredWidgetProps(component, props),
		template: component.template,
		setup: (reactiveProps, context) => {
			var _setup;
			return (_setup = component.setup) === null || _setup === void 0 ? void 0 : _setup.call(component, reactiveProps, context);
		},
		__scopeId: component.__scopeId,
		__cssModules: component.__cssModules,
		__name: component.__name,
		__file: component.__file
	});
}
//#endregion
export { Editor, EditorContent, MarkViewContent, NodeViewContent, NodeViewWrapper, VueMarkView, VueMarkViewRenderer, VueNodeViewRenderer, VueRenderer, VueWidgetRenderer, markViewProps, nodeViewProps, useEditor };

//# sourceMappingURL=index.js.map