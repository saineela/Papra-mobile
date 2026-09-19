Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
let _tiptap_core = require("@tiptap/core");
let _floating_ui_dom = require("@floating-ui/dom");
let _tiptap_pm_state = require("@tiptap/pm/state");
//#region src/floating-menu-plugin.ts
var FloatingMenuView = class {
	getTextContent(node) {
		return (0, _tiptap_core.getText)(node, { textSerializers: (0, _tiptap_core.getTextSerializersFromSchema)(this.editor.schema) });
	}
	get middlewares() {
		const middlewares = [];
		if (this.floatingUIOptions.flip) middlewares.push((0, _floating_ui_dom.flip)(typeof this.floatingUIOptions.flip !== "boolean" ? this.floatingUIOptions.flip : void 0));
		if (this.floatingUIOptions.shift) middlewares.push((0, _floating_ui_dom.shift)(typeof this.floatingUIOptions.shift !== "boolean" ? this.floatingUIOptions.shift : void 0));
		if (this.floatingUIOptions.offset) middlewares.push((0, _floating_ui_dom.offset)(typeof this.floatingUIOptions.offset !== "boolean" ? this.floatingUIOptions.offset : void 0));
		if (this.floatingUIOptions.arrow) middlewares.push((0, _floating_ui_dom.arrow)(this.floatingUIOptions.arrow));
		if (this.floatingUIOptions.size) middlewares.push((0, _floating_ui_dom.size)(typeof this.floatingUIOptions.size !== "boolean" ? this.floatingUIOptions.size : void 0));
		if (this.floatingUIOptions.autoPlacement) middlewares.push((0, _floating_ui_dom.autoPlacement)(typeof this.floatingUIOptions.autoPlacement !== "boolean" ? this.floatingUIOptions.autoPlacement : void 0));
		if (this.floatingUIOptions.hide) middlewares.push((0, _floating_ui_dom.hide)(typeof this.floatingUIOptions.hide !== "boolean" ? this.floatingUIOptions.hide : void 0));
		if (this.floatingUIOptions.inline) middlewares.push((0, _floating_ui_dom.inline)(typeof this.floatingUIOptions.inline !== "boolean" ? this.floatingUIOptions.inline : void 0));
		return middlewares;
	}
	constructor({ editor, element, view, pluginKey = "floatingMenu", updateDelay = 250, resizeDelay = 60, options, appendTo, shouldShow }) {
		var _options$scrollTarget;
		this.preventHide = false;
		this.isVisible = false;
		this.scrollTarget = window;
		this.shouldShow = ({ view, state }) => {
			const { selection } = state;
			const { $anchor, empty } = selection;
			const isRootDepth = $anchor.depth === 1;
			const isEmptyTextBlock = $anchor.parent.isTextblock && !$anchor.parent.type.spec.code && !$anchor.parent.textContent && $anchor.parent.childCount === 0 && !this.getTextContent($anchor.parent);
			if (!view.hasFocus() || !empty || !isRootDepth || !isEmptyTextBlock || !this.editor.isEditable) return false;
			return true;
		};
		this.floatingUIOptions = {
			strategy: "absolute",
			placement: "right",
			offset: 8,
			flip: {},
			shift: {},
			arrow: false,
			size: false,
			autoPlacement: false,
			hide: false,
			inline: false
		};
		this.updateHandler = (view, selectionChanged, docChanged, oldState) => {
			const { composing } = view;
			if (composing || !selectionChanged && !docChanged) return;
			if (!this.getShouldShow(oldState)) {
				this.hide();
				return;
			}
			this.updatePosition();
			this.show();
		};
		this.mousedownHandler = () => {
			this.preventHide = true;
		};
		this.focusHandler = () => {
			setTimeout(() => this.update(this.editor.view));
		};
		this.blurHandler = ({ event }) => {
			var _this$element$parentN;
			if (this.preventHide) {
				this.preventHide = false;
				return;
			}
			if ((event === null || event === void 0 ? void 0 : event.relatedTarget) && ((_this$element$parentN = this.element.parentNode) === null || _this$element$parentN === void 0 ? void 0 : _this$element$parentN.contains(event.relatedTarget))) return;
			if ((event === null || event === void 0 ? void 0 : event.relatedTarget) === this.editor.view.dom) return;
			this.hide();
		};
		this.transactionHandler = ({ transaction: tr }) => {
			const meta = tr.getMeta(this.pluginKey);
			if (meta === "updatePosition") this.updatePosition();
			else if (meta && typeof meta === "object" && meta.type === "updateOptions") this.updateOptions(meta.options);
			else if (meta === "hide") this.hide();
			else if (meta === "show") {
				this.updatePosition();
				this.show();
			}
		};
		this.resizeHandler = () => {
			if (this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer);
			this.resizeDebounceTimer = window.setTimeout(() => {
				this.updatePosition();
			}, this.resizeDelay);
		};
		this.editor = editor;
		this.element = element;
		this.view = view;
		this.pluginKey = pluginKey;
		this.updateDelay = updateDelay;
		this.resizeDelay = resizeDelay;
		this.appendTo = appendTo;
		this.scrollTarget = (_options$scrollTarget = options === null || options === void 0 ? void 0 : options.scrollTarget) !== null && _options$scrollTarget !== void 0 ? _options$scrollTarget : window;
		this.floatingUIOptions = {
			...this.floatingUIOptions,
			...options
		};
		this.element.tabIndex = 0;
		if (shouldShow) this.shouldShow = shouldShow;
		this.element.addEventListener("mousedown", this.mousedownHandler, { capture: true });
		this.editor.on("focus", this.focusHandler);
		this.editor.on("blur", this.blurHandler);
		this.editor.on("transaction", this.transactionHandler);
		window.addEventListener("resize", this.resizeHandler);
		this.scrollTarget.addEventListener("scroll", this.resizeHandler);
		this.update(view, view.state);
		if (this.getShouldShow()) {
			this.show();
			this.updatePosition();
		}
	}
	getShouldShow(oldState) {
		var _this$shouldShow;
		const { state } = this.view;
		const { selection } = state;
		const { ranges } = selection;
		const from = Math.min(...ranges.map((range) => range.$from.pos));
		const to = Math.max(...ranges.map((range) => range.$to.pos));
		return (_this$shouldShow = this.shouldShow) === null || _this$shouldShow === void 0 ? void 0 : _this$shouldShow.call(this, {
			editor: this.editor,
			view: this.view,
			state,
			oldState,
			from,
			to
		});
	}
	updateOptions(newProps) {
		if (newProps.updateDelay !== void 0) this.updateDelay = newProps.updateDelay;
		if (newProps.resizeDelay !== void 0) this.resizeDelay = newProps.resizeDelay;
		if (newProps.appendTo !== void 0) this.appendTo = newProps.appendTo;
		if (newProps.shouldShow !== void 0) {
			if (newProps.shouldShow) this.shouldShow = newProps.shouldShow;
		}
		if (newProps.options !== void 0) {
			var _newProps$options$scr;
			const newScrollTarget = (_newProps$options$scr = newProps.options.scrollTarget) !== null && _newProps$options$scr !== void 0 ? _newProps$options$scr : window;
			if (newScrollTarget !== this.scrollTarget) {
				this.scrollTarget.removeEventListener("scroll", this.resizeHandler);
				this.scrollTarget = newScrollTarget;
				this.scrollTarget.addEventListener("scroll", this.resizeHandler);
			}
			this.floatingUIOptions = {
				...this.floatingUIOptions,
				...newProps.options
			};
		}
	}
	updatePosition() {
		var _this$view;
		if (!((_this$view = this.view) === null || _this$view === void 0 || (_this$view = _this$view.dom) === null || _this$view === void 0 ? void 0 : _this$view.parentNode)) return;
		const { selection } = this.editor.state;
		const domRect = (0, _tiptap_core.posToDOMRect)(this.view, selection.from, selection.to);
		(0, _floating_ui_dom.computePosition)({
			getBoundingClientRect: () => domRect,
			getClientRects: () => [domRect]
		}, this.element, {
			placement: this.floatingUIOptions.placement,
			strategy: this.floatingUIOptions.strategy,
			middleware: this.middlewares
		}).then(({ x, y, strategy, middlewareData }) => {
			var _middlewareData$hide, _middlewareData$hide2;
			if (((_middlewareData$hide = middlewareData.hide) === null || _middlewareData$hide === void 0 ? void 0 : _middlewareData$hide.referenceHidden) || ((_middlewareData$hide2 = middlewareData.hide) === null || _middlewareData$hide2 === void 0 ? void 0 : _middlewareData$hide2.escaped)) {
				this.element.style.visibility = "hidden";
				return;
			}
			this.element.style.visibility = "visible";
			this.element.style.width = "max-content";
			this.element.style.position = strategy;
			this.element.style.left = `${x}px`;
			this.element.style.top = `${y}px`;
			if (this.isVisible && this.floatingUIOptions.onUpdate) this.floatingUIOptions.onUpdate();
		});
	}
	update(view, oldState) {
		const selectionChanged = !(oldState === null || oldState === void 0 ? void 0 : oldState.selection.eq(view.state.selection));
		const docChanged = !(oldState === null || oldState === void 0 ? void 0 : oldState.doc.eq(view.state.doc));
		this.updateHandler(view, selectionChanged, docChanged, oldState);
	}
	show() {
		var _ref;
		if (this.isVisible) return;
		this.element.style.visibility = "visible";
		this.element.style.opacity = "1";
		const appendToElement = typeof this.appendTo === "function" ? this.appendTo() : this.appendTo;
		(_ref = appendToElement !== null && appendToElement !== void 0 ? appendToElement : this.view.dom.parentElement) === null || _ref === void 0 || _ref.appendChild(this.element);
		if (this.floatingUIOptions.onShow) this.floatingUIOptions.onShow();
		this.isVisible = true;
	}
	hide() {
		if (!this.isVisible) return;
		this.element.style.visibility = "hidden";
		this.element.style.opacity = "0";
		this.element.remove();
		if (this.floatingUIOptions.onHide) this.floatingUIOptions.onHide();
		this.isVisible = false;
	}
	destroy() {
		this.hide();
		this.element.removeEventListener("mousedown", this.mousedownHandler, { capture: true });
		window.removeEventListener("resize", this.resizeHandler);
		this.scrollTarget.removeEventListener("scroll", this.resizeHandler);
		this.editor.off("focus", this.focusHandler);
		this.editor.off("blur", this.blurHandler);
		this.editor.off("transaction", this.transactionHandler);
		if (this.floatingUIOptions.onDestroy) this.floatingUIOptions.onDestroy();
	}
};
const FloatingMenuPlugin = (options) => {
	return new _tiptap_pm_state.Plugin({
		key: typeof options.pluginKey === "string" ? new _tiptap_pm_state.PluginKey(options.pluginKey) : options.pluginKey,
		view: (view) => new FloatingMenuView({
			view,
			...options
		})
	});
};
//#endregion
//#region src/floating-menu.ts
/**
* This extension allows you to create a floating menu.
* @see https://tiptap.dev/api/extensions/floating-menu
*/
const FloatingMenu = _tiptap_core.Extension.create({
	name: "floatingMenu",
	addOptions() {
		return {
			element: null,
			options: {},
			pluginKey: "floatingMenu",
			updateDelay: void 0,
			resizeDelay: void 0,
			appendTo: void 0,
			shouldShow: null
		};
	},
	addCommands() {
		return { updateFloatingMenuPosition: () => ({ tr, dispatch }) => {
			if (dispatch) tr.setMeta(this.options.pluginKey, "updatePosition");
			return true;
		} };
	},
	addProseMirrorPlugins() {
		if (!this.options.element) return [];
		return [FloatingMenuPlugin({
			pluginKey: this.options.pluginKey,
			editor: this.editor,
			element: this.options.element,
			updateDelay: this.options.updateDelay,
			resizeDelay: this.options.resizeDelay,
			options: this.options.options,
			appendTo: this.options.appendTo,
			shouldShow: this.options.shouldShow
		})];
	}
});
//#endregion
//#region src/index.ts
var src_default = FloatingMenu;
//#endregion
exports.FloatingMenu = FloatingMenu;
exports.FloatingMenuPlugin = FloatingMenuPlugin;
exports.FloatingMenuView = FloatingMenuView;
exports.default = src_default;

//# sourceMappingURL=index.cjs.map