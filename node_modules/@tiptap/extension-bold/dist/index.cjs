Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
let _tiptap_core = require("@tiptap/core");
let _tiptap_core_jsx_runtime = require("@tiptap/core/jsx-runtime");
//#region src/bold.tsx
/** @jsxImportSource @tiptap/core */
/**
* Matches bold text via `**` as input.
*/
const starInputRegex = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/;
/**
* Matches bold text via `**` while pasting.
*/
const starPasteRegex = /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))/g;
/**
* Matches bold text via `__` as input.
*/
const underscoreInputRegex = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;
/**
* Matches bold text via `__` while pasting.
*/
const underscorePasteRegex = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))/g;
/**
* This extension allows you to mark text as bold.
* @see https://tiptap.dev/api/marks/bold
*/
const Bold = _tiptap_core.Mark.create({
	name: "bold",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [
			{ tag: "strong" },
			{
				tag: "b",
				getAttrs: (node) => node.style.fontWeight !== "normal" && null
			},
			{
				style: "font-weight=400",
				clearMark: (mark) => mark.type.name === this.name
			},
			{
				style: "font-weight",
				getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null
			}
		];
	},
	renderHTML({ HTMLAttributes }) {
		return /* @__PURE__ */ (0, _tiptap_core_jsx_runtime.jsx)("strong", {
			...(0, _tiptap_core.mergeAttributes)(this.options.HTMLAttributes, HTMLAttributes),
			children: /* @__PURE__ */ (0, _tiptap_core_jsx_runtime.jsx)("slot", {})
		});
	},
	markdownTokenName: "strong",
	parseMarkdown: (token, helpers) => {
		return helpers.applyMark("bold", helpers.parseInline(token.tokens || []));
	},
	markdownOptions: { htmlReopen: {
		open: "<strong>",
		close: "</strong>"
	} },
	renderMarkdown: (node, h) => {
		return `**${h.renderChildren(node)}**`;
	},
	addCommands() {
		return {
			setBold: () => ({ commands }) => {
				return commands.setMark(this.name);
			},
			toggleBold: () => ({ commands }) => {
				return commands.toggleMark(this.name);
			},
			unsetBold: () => ({ commands }) => {
				return commands.unsetMark(this.name);
			}
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-b": () => this.editor.commands.toggleBold(),
			"Mod-B": () => this.editor.commands.toggleBold()
		};
	},
	addInputRules() {
		return [(0, _tiptap_core.markInputRule)({
			find: starInputRegex,
			type: this.type
		}), (0, _tiptap_core.markInputRule)({
			find: underscoreInputRegex,
			type: this.type
		})];
	},
	addPasteRules() {
		return [(0, _tiptap_core.markPasteRule)({
			find: starPasteRegex,
			type: this.type
		}), (0, _tiptap_core.markPasteRule)({
			find: underscorePasteRegex,
			type: this.type
		})];
	}
});
//#endregion
//#region src/index.ts
var src_default = Bold;
//#endregion
exports.Bold = Bold;
exports.default = src_default;
exports.starInputRegex = starInputRegex;
exports.starPasteRegex = starPasteRegex;
exports.underscoreInputRegex = underscoreInputRegex;
exports.underscorePasteRegex = underscorePasteRegex;

//# sourceMappingURL=index.cjs.map