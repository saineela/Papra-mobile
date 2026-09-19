import { Mark, markInputRule, markPasteRule, mergeAttributes } from "@tiptap/core";
//#region src/italic.ts
/**
* Matches an italic to a *italic* on input.
*/
const starInputRegex = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/;
/**
* Matches an italic to a *italic* on paste.
*/
const starPasteRegex = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))/g;
/**
* Matches an italic to a _italic_ on input.
*/
const underscoreInputRegex = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/;
/**
* Matches an italic to a _italic_ on paste.
*/
const underscorePasteRegex = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))/g;
/**
* This extension allows you to create italic text.
* @see https://www.tiptap.dev/api/marks/italic
*/
const Italic = Mark.create({
	name: "italic",
	addOptions() {
		return { HTMLAttributes: {} };
	},
	parseHTML() {
		return [
			{ tag: "em" },
			{
				tag: "i",
				getAttrs: (node) => node.style.fontStyle !== "normal" && null
			},
			{
				style: "font-style=normal",
				clearMark: (mark) => mark.type.name === this.name
			},
			{ style: "font-style=italic" }
		];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"em",
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
			0
		];
	},
	addCommands() {
		return {
			setItalic: () => ({ commands }) => {
				return commands.setMark(this.name);
			},
			toggleItalic: () => ({ commands }) => {
				return commands.toggleMark(this.name);
			},
			unsetItalic: () => ({ commands }) => {
				return commands.unsetMark(this.name);
			}
		};
	},
	markdownTokenName: "em",
	parseMarkdown: (token, helpers) => {
		return helpers.applyMark("italic", helpers.parseInline(token.tokens || []));
	},
	markdownOptions: { htmlReopen: {
		open: "<em>",
		close: "</em>"
	} },
	renderMarkdown: (node, h) => {
		return `*${h.renderChildren(node)}*`;
	},
	addKeyboardShortcuts() {
		return {
			"Mod-i": () => this.editor.commands.toggleItalic(),
			"Mod-I": () => this.editor.commands.toggleItalic()
		};
	},
	addInputRules() {
		return [markInputRule({
			find: starInputRegex,
			type: this.type
		}), markInputRule({
			find: underscoreInputRegex,
			type: this.type
		})];
	},
	addPasteRules() {
		return [markPasteRule({
			find: starPasteRegex,
			type: this.type
		}), markPasteRule({
			find: underscorePasteRegex,
			type: this.type
		})];
	}
});
//#endregion
//#region src/index.ts
var src_default = Italic;
//#endregion
export { Italic, src_default as default, starInputRegex, starPasteRegex, underscoreInputRegex, underscorePasteRegex };

//# sourceMappingURL=index.js.map