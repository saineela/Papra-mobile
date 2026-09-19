Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
let _tiptap_core = require("@tiptap/core");
//#region src/strike.ts
/**
* Matches a strike to a ~~strike~~ on input.
*/
const inputRegex = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))$/;
/**
* Matches a strike to a ~~strike~~ on paste.
*/
const pasteRegex = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))/g;
/**
* This extension allows you to create strike text.
* @see https://www.tiptap.dev/api/marks/strike
*/
const Strike = _tiptap_core.Mark.create({
	name: "strike",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [
			{ tag: "s" },
			{ tag: "del" },
			{ tag: "strike" },
			{
				style: "text-decoration",
				consuming: false,
				getAttrs: (style) => style.includes("line-through") ? {} : false
			}
		];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"s",
			(0, _tiptap_core.mergeAttributes)(this.options.HTMLAttributes, HTMLAttributes),
			0
		];
	},
	markdownTokenName: "del",
	parseMarkdown: (token, helpers) => {
		return helpers.applyMark("strike", helpers.parseInline(token.tokens || []));
	},
	renderMarkdown: (node, h) => {
		return `~~${h.renderChildren(node)}~~`;
	},
	addCommands() {
		return {
			setStrike: () => ({ commands }) => {
				return commands.setMark(this.name);
			},
			toggleStrike: () => ({ commands }) => {
				return commands.toggleMark(this.name);
			},
			unsetStrike: () => ({ commands }) => {
				return commands.unsetMark(this.name);
			}
		};
	},
	addKeyboardShortcuts() {
		return { "Mod-Shift-s": () => this.editor.commands.toggleStrike() };
	},
	addInputRules() {
		return [(0, _tiptap_core.markInputRule)({
			find: inputRegex,
			type: this.type
		})];
	},
	addPasteRules() {
		return [(0, _tiptap_core.markPasteRule)({
			find: pasteRegex,
			type: this.type
		})];
	}
});
//#endregion
//#region src/index.ts
var src_default = Strike;
//#endregion
exports.Strike = Strike;
exports.default = src_default;
exports.inputRegex = inputRegex;
exports.pasteRegex = pasteRegex;

//# sourceMappingURL=index.cjs.map