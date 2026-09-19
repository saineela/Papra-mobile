Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
let _tiptap_core = require("@tiptap/core");
//#region src/image.ts
/**
* Matches an image to a ![image](src "title") on input.
*/
const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;
/**
* This extension allows you to insert images.
* @see https://www.tiptap.dev/api/nodes/image
*/
const Image = _tiptap_core.Node.create({
	name: "image",
	addOptions() {
		return {
			inline: false,
			allowBase64: false,
			HTMLAttributes: {},
			resize: false
		};
	},
	inline() {
		return this.options.inline;
	},
	group() {
		return this.options.inline ? "inline" : "block";
	},
	draggable: true,
	addAttributes() {
		return {
			src: { default: null },
			alt: { default: null },
			title: { default: null },
			width: { default: null },
			height: { default: null }
		};
	},
	parseHTML() {
		return [{ tag: this.options.allowBase64 ? "img[src]" : "img[src]:not([src^=\"data:\"])" }];
	},
	renderHTML({ HTMLAttributes }) {
		return ["img", (0, _tiptap_core.mergeAttributes)(this.options.HTMLAttributes, HTMLAttributes)];
	},
	parseMarkdown: (token, helpers) => {
		return helpers.createNode("image", {
			src: token.href,
			title: token.title,
			alt: token.text
		});
	},
	renderMarkdown: (node) => {
		var _node$attrs$src, _node$attrs, _node$attrs$alt, _node$attrs2, _node$attrs$title, _node$attrs3;
		const src = (_node$attrs$src = (_node$attrs = node.attrs) === null || _node$attrs === void 0 ? void 0 : _node$attrs.src) !== null && _node$attrs$src !== void 0 ? _node$attrs$src : "";
		const alt = (_node$attrs$alt = (_node$attrs2 = node.attrs) === null || _node$attrs2 === void 0 ? void 0 : _node$attrs2.alt) !== null && _node$attrs$alt !== void 0 ? _node$attrs$alt : "";
		const title = (_node$attrs$title = (_node$attrs3 = node.attrs) === null || _node$attrs3 === void 0 ? void 0 : _node$attrs3.title) !== null && _node$attrs$title !== void 0 ? _node$attrs$title : "";
		return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
	},
	addNodeView() {
		if (!this.options.resize || !this.options.resize.enabled || typeof document === "undefined") return null;
		const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = this.options.resize;
		const resizeManagedAttributes = /* @__PURE__ */ new Set([
			"src",
			"width",
			"height"
		]);
		return ({ node, getPos, HTMLAttributes, editor }) => {
			const el = document.createElement("img");
			el.draggable = false;
			const mergedAttributes = (0, _tiptap_core.mergeAttributes)(this.options.HTMLAttributes, HTMLAttributes);
			Object.entries(mergedAttributes).forEach(([key, value]) => {
				if (value != null) switch (key) {
					case "src":
					case "width":
					case "height": break;
					default: el.setAttribute(key, value);
				}
			});
			if (mergedAttributes.src !== null) el.src = mergedAttributes.src;
			let previousHTMLAttributes = { ...HTMLAttributes };
			const syncImageSource = (src) => {
				if (typeof src === "string" && src !== "") {
					if (el.getAttribute("src") !== src) el.src = src;
					return;
				}
				if (el.hasAttribute("src")) el.removeAttribute("src");
				if (el.src !== "") el.src = "";
			};
			syncImageSource(HTMLAttributes.src);
			const onUpdate = (updatedNode) => {
				if (updatedNode.type !== node.type) return false;
				const extensionAttributes = editor.extensionManager.attributes.filter((attribute) => attribute.type === updatedNode.type.name);
				const newHTMLAttributes = (0, _tiptap_core.getRenderedAttributes)(updatedNode, extensionAttributes);
				Object.keys(previousHTMLAttributes).forEach((key) => {
					if (!resizeManagedAttributes.has(key) && !(key in newHTMLAttributes)) el.removeAttribute(key);
				});
				Object.entries(newHTMLAttributes).forEach(([key, value]) => {
					if (resizeManagedAttributes.has(key)) return;
					if (value != null) el.setAttribute(key, value);
					else el.removeAttribute(key);
				});
				syncImageSource(newHTMLAttributes.src);
				previousHTMLAttributes = newHTMLAttributes;
				return true;
			};
			const nodeView = new _tiptap_core.ResizableNodeView({
				element: el,
				editor,
				node,
				getPos,
				onResize: (width, height) => {
					el.style.width = `${width}px`;
					el.style.height = `${height}px`;
				},
				onCommit: (width, height) => {
					const pos = getPos();
					if (pos === void 0) return;
					this.editor.chain().setNodeSelection(pos).updateAttributes(this.name, {
						width,
						height
					}).run();
				},
				onUpdate,
				options: {
					directions,
					min: {
						width: minWidth,
						height: minHeight
					},
					preserveAspectRatio: alwaysPreserveAspectRatio === true
				}
			});
			const dom = nodeView.dom;
			const showNodeView = () => {
				dom.style.visibility = "";
				dom.style.pointerEvents = "";
			};
			dom.style.visibility = "hidden";
			dom.style.pointerEvents = "none";
			if (el.complete && el.naturalWidth > 0) showNodeView();
			else {
				el.onload = showNodeView;
				el.onerror = showNodeView;
			}
			return nodeView;
		};
	},
	addCommands() {
		return { setImage: (options) => ({ commands }) => {
			return commands.insertContent({
				type: this.name,
				attrs: options
			});
		} };
	},
	addInputRules() {
		return [(0, _tiptap_core.nodeInputRule)({
			find: inputRegex,
			type: this.type,
			getAttributes: (match) => {
				const [, , alt, src, title] = match;
				return {
					src,
					alt,
					title
				};
			}
		})];
	}
});
//#endregion
//#region src/index.ts
var src_default = Image;
//#endregion
exports.Image = Image;
exports.default = src_default;
exports.inputRegex = inputRegex;

//# sourceMappingURL=index.cjs.map