Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
let _tiptap_core = require("@tiptap/core");
//#region src/underline.ts
/**
* This extension allows you to create underline text.
* @see https://www.tiptap.dev/api/marks/underline
*/
const Underline = _tiptap_core.Mark.create({
	name: "underline",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [{ tag: "u" }, {
			style: "text-decoration",
			consuming: false,
			getAttrs: (style) => style.includes("underline") ? {} : false
		}];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"u",
			(0, _tiptap_core.mergeAttributes)(this.options.HTMLAttributes, HTMLAttributes),
			0
		];
	},
	parseMarkdown(token, helpers) {
		return helpers.applyMark(this.name || "underline", helpers.parseInline(token.tokens || []));
	},
	renderMarkdown(node, helpers) {
		return `++${helpers.renderChildren(node)}++`;
	},
	markdownTokenizer: {
		name: "underline",
		level: "inline",
		start(src) {
			return src.indexOf("++");
		},
		tokenize(src, _tokens, lexer) {
			const match = /^(\+\+)([\s\S]+?)(\+\+)/.exec(src);
			if (!match) return;
			const innerContent = match[2].trim();
			return {
				type: "underline",
				raw: match[0],
				text: innerContent,
				tokens: lexer.inlineTokens(innerContent)
			};
		}
	},
	addCommands() {
		return {
			setUnderline: () => ({ commands }) => {
				return commands.setMark(this.name);
			},
			toggleUnderline: () => ({ commands }) => {
				return commands.toggleMark(this.name);
			},
			unsetUnderline: () => ({ commands }) => {
				return commands.unsetMark(this.name);
			}
		};
	},
	addKeyboardShortcuts() {
		return {
			"Mod-u": () => this.editor.commands.toggleUnderline(),
			"Mod-U": () => this.editor.commands.toggleUnderline()
		};
	}
});
//#endregion
//#region src/index.ts
var src_default = Underline;
//#endregion
exports.Underline = Underline;
exports.default = src_default;

//# sourceMappingURL=index.cjs.map